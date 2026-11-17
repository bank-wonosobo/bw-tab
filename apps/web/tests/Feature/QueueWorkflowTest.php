<?php

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\QueueService;
use App\Models\QueueSession;
use App\Models\QueueTicket;
use App\Models\Role;
use App\Models\ServiceCounter;
use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function provisionQueue(): array
{
    test()->freezeTime();
    test()->withoutVite();
    test()->seed();

    return [User::where('email', 'admin@bankwonosobo.test')->firstOrFail(), Branch::where('code', 'PST')->firstOrFail(), QueueService::where('code', 'TARIK_TUNAI')->firstOrFail()];
}

function issueQueueTicket(Branch $branch, QueueService $service, ?string $requestId = null): QueueTicket
{
    test()->post('/client/antrian', ['branch_id' => $branch->id, 'service_id' => $service->id, 'request_id' => $requestId ?? (string) Str::uuid()])->assertRedirect()->assertSessionHasNoErrors();

    return QueueTicket::latest('ticket_number')->firstOrFail();
}

test('client queue resolves its real component and database services', function () {
    provisionQueue();

    $this->get('/client/antrian')->assertRedirect('/client/kantor-pusat');
    $this->get('/client/kantor-pusat')->assertOk()->assertInertia(fn (Assert $page) => $page->component('client/queue')->has('branches', 1)->has('services', 5)->where('branch.slug', 'kantor-pusat'));
});

test('admin requires login and inactive users cannot authenticate', function () {
    [$admin] = provisionQueue();
    $admin->update(['is_active' => false]);

    $this->get('/admin')->assertRedirect('/login');
    $this->post('/login', ['email' => $admin->email, 'password' => 'password'])->assertSessionHasErrors('email');
    $this->assertGuest();
});

test('active administrator can sign in and sign out', function () {
    [$admin] = provisionQueue();

    $this->post('/login', ['email' => $admin->email, 'password' => 'password'])->assertRedirect('/admin');
    $this->assertAuthenticatedAs($admin);
    $this->post('/logout')->assertRedirect('/login');
    $this->assertGuest();
});

test('ticket numbering is sequential and retrying one request is idempotent', function () {
    [, $branch, $service] = provisionQueue();
    $requestId = (string) Str::uuid();

    $first = issueQueueTicket($branch, $service, $requestId);
    issueQueueTicket($branch, $service, $requestId);
    $second = issueQueueTicket($branch, $service);

    expect($first->ticket_code)->toBe('E001');
    expect($second->ticket_code)->toBe('E002');
    $this->assertDatabaseCount('queue_tickets', 2);
    $this->assertDatabaseCount('queue_ticket_events', 2);
    $this->assertDatabaseHas('queue_sequences', ['service_id' => $service->id, 'last_number' => 2]);
});

test('client can follow only tickets belonging to its browser session', function () {
    [, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);

    $this->get('/client/tiket/'.$ticket->id)->assertOk()->assertInertia(fn (Assert $page) => $page->component('client/ticket')->where('ticket.ticket_code', 'E001'));
    $this->withSession(['queue_tickets' => []])->get('/client/tiket/'.$ticket->id)->assertNotFound();
});

test('closed sessions refuse ticket issuance without changing sequences', function () {
    [, $branch, $service] = provisionQueue();
    QueueSession::where('branch_id', $branch->id)->update(['status' => 'CLOSED']);

    $this->post('/client/antrian', ['branch_id' => $branch->id, 'service_id' => $service->id, 'request_id' => (string) Str::uuid()])->assertSessionHasErrors('queue');

    $this->assertDatabaseCount('queue_tickets', 0);
    $this->assertDatabaseMissing('queue_sequences', ['last_number' => 1]);
});

test('daily quota and service availability are enforced by the server', function () {
    [, $branch, $service] = provisionQueue();
    AppSetting::create(['id' => 'queue', 'value' => ['max_daily_tickets' => 1]]);
    issueQueueTicket($branch, $service);

    $this->post('/client/antrian', ['branch_id' => $branch->id, 'service_id' => $service->id, 'request_id' => (string) Str::uuid()])->assertSessionHasErrors('queue');

    $this->assertDatabaseCount('queue_tickets', 1);
});

test('counter calls only its configured services and records complete lifecycle', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $counter = ServiceCounter::where('branch_id', $branch->id)->where('code', '01')->firstOrFail();
    $payload = ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id];

    $this->actingAs($admin)->post('/admin/queue/action', $payload + ['action' => 'next'])->assertSessionHasNoErrors();
    $this->post('/admin/queue/action', $payload + ['action' => 'recall'])->assertSessionHasNoErrors();
    $this->post('/admin/queue/action', $payload + ['action' => 'start'])->assertSessionHasNoErrors();
    $this->travel(7)->minutes();
    $this->post('/admin/queue/action', $payload + ['action' => 'complete'])->assertSessionHasNoErrors();

    $this->assertDatabaseHas('queue_tickets', ['id' => $ticket->id, 'status' => 'COMPLETED', 'counter_id' => $counter->id]);
    $this->assertDatabaseHas('queue_calls', ['ticket_id' => $ticket->id, 'call_number' => 2, 'response_status' => 'ANSWERED']);
    $this->assertDatabaseCount('queue_ticket_events', 5);
    $this->get('/admin?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page->component('admin/queue')->where('stats.completed', 1)->where('stats.avg_service', 7));
});

test('a busy counter and stale transitions are rejected', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $counter = ServiceCounter::where('branch_id', $branch->id)->where('code', '01')->firstOrFail();
    $payload = ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id];
    $this->actingAs($admin)->post('/admin/queue/action', $payload + ['action' => 'next'])->assertSessionHasNoErrors();

    $this->post('/admin/queue/action', $payload + ['action' => 'next'])->assertSessionHasErrors('queue');
    $this->post('/admin/queue/action', $payload + ['action' => 'complete'])->assertSessionHasErrors('queue');

    $this->assertDatabaseHas('queue_tickets', ['id' => $ticket->id, 'status' => 'CALLED']);
    $this->assertDatabaseCount('queue_calls', 1);
});

test('skipped tickets can rejoin and waiting tickets can be cancelled', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $counter = ServiceCounter::where('branch_id', $branch->id)->where('code', '01')->firstOrFail();
    $payload = ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id];
    $this->actingAs($admin)->post('/admin/queue/action', $payload + ['action' => 'next']);

    $this->post('/admin/queue/action', $payload + ['action' => 'skip'])->assertSessionHasNoErrors();
    $this->post('/admin/queue/action', $payload + ['action' => 'requeue'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('queue_tickets', ['id' => $ticket->id, 'status' => 'WAITING', 'counter_id' => null]);
    $this->post('/admin/queue/action', $payload + ['action' => 'cancel'])->assertSessionHasNoErrors();
    $this->assertDatabaseHas('queue_tickets', ['id' => $ticket->id, 'status' => 'CANCELLED']);
});

test('session cannot close with outstanding tickets and can reopen without resetting numbers', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);

    $this->actingAs($admin)->post('/admin/queue/session', ['branch_id' => $branch->id, 'action' => 'close'])->assertSessionHasErrors('queue');
    $this->post('/admin/queue/action', ['branch_id' => $branch->id, 'ticket_id' => $ticket->id, 'action' => 'cancel'])->assertSessionHasNoErrors();
    $this->post('/admin/queue/session', ['branch_id' => $branch->id, 'action' => 'close'])->assertSessionHasNoErrors();
    $this->post('/admin/queue/session', ['branch_id' => $branch->id, 'action' => 'open'])->assertSessionHasNoErrors();
    $next = issueQueueTicket($branch, $service);

    expect($next->ticket_code)->toBe('E002');
});

test('officers cannot inspect another branch or administer global configuration', function () {
    [, $branch] = provisionQueue();
    $other = Branch::where('code', 'KAL')->firstOrFail();
    $counter = ServiceCounter::where('branch_id', $branch->id)->firstOrFail();
    $officer = User::factory()->create(['role_id' => 'officer', 'branch_id' => $branch->id, 'counter_id' => $counter->id]);

    $this->actingAs($officer)->get('/admin?branch_id='.$other->id)->assertForbidden();
    $this->get('/admin/master/users')->assertForbidden();
    $this->get('/admin/settings/roles')->assertForbidden();
    $this->get('/admin/reports/history')->assertForbidden();
});

test('counter cannot call tickets from another branch or another service', function () {
    [$admin, $branch, $service] = provisionQueue();
    issueQueueTicket($branch, $service);
    $other = ServiceCounter::where('branch_id', '!=', $branch->id)->firstOrFail();
    $cs = ServiceCounter::where('branch_id', $branch->id)->where('code', '02')->firstOrFail();

    $this->actingAs($admin)->post('/admin/queue/action', ['branch_id' => $branch->id, 'counter_id' => $other->id, 'action' => 'next'])->assertNotFound();
    $this->post('/admin/queue/action', ['branch_id' => $branch->id, 'counter_id' => $cs->id, 'action' => 'next'])->assertSessionHasErrors('queue');

    $this->assertDatabaseCount('queue_calls', 0);
});

test('master counter form persists multiple services with UUID pivot ids', function () {
    [$admin, $branch] = provisionQueue();
    $serviceIds = QueueService::take(2)->pluck('id')->all();

    $this->actingAs($admin)->post('/admin/master/counters', ['name' => 'Loket Baru', 'code' => '03', 'branch_id' => $branch->id, 'is_active' => true, 'service_ids' => $serviceIds])->assertSessionHasNoErrors();

    $counter = ServiceCounter::where('code', '03')->firstOrFail();
    expect($counter->services()->count())->toBe(2);
    $this->assertDatabaseHas('counter_services', ['counter_id' => $counter->id, 'service_id' => $serviceIds[0]]);
});

test('seed reruns preserve sequence numbers and closed sessions', function () {
    [, $branch, $service] = provisionQueue();
    issueQueueTicket($branch, $service);
    QueueSession::where('branch_id', $branch->id)->update(['status' => 'CLOSED']);

    $this->seed();

    $this->assertDatabaseHas('queue_sequences', ['service_id' => $service->id, 'last_number' => 1]);
    $this->assertDatabaseHas('queue_sessions', ['branch_id' => $branch->id, 'status' => 'CLOSED']);
});

test('all admin menu pages resolve existing Inertia components', function (string $path, string $component) {
    [$admin] = provisionQueue();

    $this->actingAs($admin)->get($path)->assertOk()->assertInertia(fn (Assert $page) => $page->component($component));
})->with([
    ['/admin/queue/monitor', 'admin/queue'], ['/admin/queue/tickets', 'admin/queue'], ['/admin/queue/calls', 'admin/queue'],
    ['/admin/reports/statistics', 'admin/queue'], ['/admin/reports/service-time', 'admin/queue'], ['/admin/reports/history', 'admin/queue'],
    ['/admin/master/branches', 'admin/master'], ['/admin/master/services', 'admin/master'], ['/admin/master/counters', 'admin/master'], ['/admin/master/users', 'admin/master'],
    ['/admin/settings/users', 'admin/master'], ['/admin/settings/roles', 'admin/settings'], ['/admin/settings/queue', 'admin/settings'], ['/admin/settings/display', 'admin/settings'],
]);

test('report export includes database tickets and display never exposes customer identity', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $ticket->update(['customer_name' => 'PRIVATE-NAME', 'customer_reference' => 'PRIVATE-ACCOUNT']);

    $response = $this->actingAs($admin)->get('/admin/reports/history?export=1&branch_id='.$branch->id)->assertOk()->assertDownload('laporan-antrean.csv');
    expect($response->streamedContent())->toContain('E001')->not->toContain('PRIVATE-ACCOUNT');
    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertDontSee('PRIVATE-NAME')->assertDontSee('PRIVATE-ACCOUNT');
});

test('display lists every counter in the selected branch even without calls', function () {
    [, $branch] = provisionQueue();
    $counters = ServiceCounter::where('branch_id', $branch->id)->orderBy('code')->get();
    $counters[1]->update(['is_active' => false]);

    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('client/display')
        ->has('calls', 0)
        ->has('counters', 2)
        ->where('counters.0.id', $counters[0]->id)
        ->where('counters.0.is_active', true)
        ->where('counters.0.current', null)
        ->has('counters.0.services', 4)
        ->where('counters.1.id', $counters[1]->id)
        ->where('counters.1.is_active', false)
        ->where('counters.1.current', null));
});

test('display keeps each counter current until service completes without exposing customer data', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $ticket->update(['customer_name' => 'PRIVATE-NAME', 'customer_reference' => 'PRIVATE-ACCOUNT']);
    $counter = ServiceCounter::where('branch_id', $branch->id)->where('code', '01')->firstOrFail();
    $payload = ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id];
    $this->actingAs($admin)->post('/admin/queue/action', $payload + ['action' => 'next'])->assertSessionHasNoErrors();
    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('counters.0.current.ticket_code', 'E001')
        ->where('counters.0.current.status', 'CALLED')
        ->where('counters.0.current.service.name', $service->name)
        ->where('counters.1.current', null))
        ->assertDontSee('PRIVATE-NAME')->assertDontSee('PRIVATE-ACCOUNT');

    $this->post('/admin/queue/action', $payload + ['action' => 'start'])->assertSessionHasNoErrors();
    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('counters.0.current.status', 'SERVING'));

    $this->post('/admin/queue/action', $payload + ['action' => 'complete'])->assertSessionHasNoErrors();
    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('counters.0.current', null)
        ->where('calls.0.ticket.ticket_code', 'E001'));
});

test('display does not use yesterday tickets as current counter queues', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $counter = ServiceCounter::where('branch_id', $branch->id)->where('code', '01')->firstOrFail();
    $this->actingAs($admin)->post('/admin/queue/action', ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'action' => 'next'])->assertSessionHasNoErrors();
    $ticket->session->update(['business_date' => today()->subDay()]);

    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('counters', 2)
        ->where('counters.0.current', null)
        ->has('calls', 0));
});

test('display shows teller and customer service queues at the same time', function () {
    [$admin, $branch, $service] = provisionQueue();
    issueQueueTicket($branch, $service);
    issueQueueTicket($branch, QueueService::where('code', 'CS')->firstOrFail());
    $counters = ServiceCounter::where('branch_id', $branch->id)->orderBy('code')->get();

    foreach ($counters as $counter) {
        $this->actingAs($admin)->post('/admin/queue/action', ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'action' => 'next'])->assertSessionHasNoErrors();
    }

    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('counters.0.current.ticket_code', 'E001')
        ->where('counters.1.current.ticket_code', 'B001'));
});

test('display returns the newest recall first even when call timestamps are identical', function () {
    [$admin, $branch, $service] = provisionQueue();
    $ticket = issueQueueTicket($branch, $service);
    $counter = ServiceCounter::where('branch_id', $branch->id)->where('code', '01')->firstOrFail();
    $payload = ['branch_id' => $branch->id, 'counter_id' => $counter->id, 'ticket_id' => $ticket->id];
    $this->actingAs($admin)->post('/admin/queue/action', $payload + ['action' => 'next'])->assertSessionHasNoErrors();
    $this->post('/admin/queue/action', $payload + ['action' => 'recall'])->assertSessionHasNoErrors();
    $recallId = $ticket->calls()->where('call_number', 2)->value('id');

    $this->get('/display?branch_id='.$branch->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->has('calls', 2)
        ->where('calls.0.id', $recallId)
        ->where('calls.0.ticket.ticket_code', 'E001')
        ->where('calls.0.call_number', 2)
        ->where('calls.0.counter.code', '01')
        ->where('calls.1.call_number', 1));
});

test('administrator can persist queue settings and role permissions', function () {
    [$admin] = provisionQueue();

    $this->actingAs($admin)->post('/admin/settings/queue', ['digits' => 4, 'max_daily_tickets' => 50])->assertSessionHasNoErrors();
    $this->post('/admin/settings/roles', ['role_id' => 'officer', 'permissions' => ['operate', 'reports']])->assertSessionHasNoErrors();

    expect(AppSetting::values('queue'))->toMatchArray(['digits' => 4, 'max_daily_tickets' => 50]);
    expect(Role::find('officer')->permissions)->toBe(['operate', 'reports']);
});

test('administrator can configure and clear the advertisement video shown on the display', function () {
    [$admin] = provisionQueue();
    $settings = AppSetting::values('display');
    $this->get('/display')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('settings.video_url', null));

    $settings['video_url'] = 'https://media.example.test/iklan-bank.mp4';
    $this->actingAs($admin)->post('/admin/settings/display', $settings)->assertRedirect()->assertSessionHasNoErrors();
    expect(AppSetting::values('display')['video_url'])->toBe('https://media.example.test/iklan-bank.mp4');
    $this->get('/admin/settings/display')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('settings.video_url', 'https://media.example.test/iklan-bank.mp4'));
    $this->get('/display')->assertOk()->assertInertia(fn (Assert $page) => $page
        ->where('settings.video_url', 'https://media.example.test/iklan-bank.mp4'));

    $settings['video_url'] = '';
    $this->post('/admin/settings/display', $settings)->assertRedirect()->assertSessionHasNoErrors();
    expect(AppSetting::values('display')['video_url'])->toBeNull();
});

test('display settings reject invalid advertisement video URLs without changing the saved video', function (string $url) {
    [$admin] = provisionQueue();
    $settings = AppSetting::values('display');
    $settings['video_url'] = 'https://media.example.test/iklan-bank.mp4';
    AppSetting::create(['id' => 'display', 'value' => $settings]);
    $settings['video_url'] = $url;

    $this->actingAs($admin)->post('/admin/settings/display', $settings)->assertSessionHasErrors('video_url');

    expect(AppSetting::values('display')['video_url'])->toBe('https://media.example.test/iklan-bank.mp4');
})->with(['not-a-url', 'javascript:alert(1)', 'ftp://media.example.test/iklan.mp4']);

test('role settings cannot remove required operational permission or grant global access', function () {
    [$admin] = provisionQueue();

    $this->actingAs($admin)->post('/admin/settings/roles', ['role_id' => 'officer', 'permissions' => ['reports']])->assertSessionHasErrors('permissions');
    $this->post('/admin/settings/roles', ['role_id' => 'officer', 'permissions' => ['operate', 'users']])->assertSessionHasErrors('permissions.1');

    expect(Role::find('officer')->permissions)->toBe(['operate']);
});

test('administrator can assign an officer but mismatched counter and self lockout are rejected', function () {
    [$admin, $branch] = provisionQueue();
    $counter = ServiceCounter::where('branch_id', $branch->id)->firstOrFail();
    $payload = ['name' => 'Petugas Uji', 'email' => 'petugas@example.test', 'password' => 'test-password', 'role_id' => 'officer', 'branch_id' => $branch->id, 'counter_id' => $counter->id, 'is_active' => true];

    $this->actingAs($admin)->post('/admin/master/users', $payload)->assertSessionHasNoErrors();
    $this->assertDatabaseHas('users', ['email' => 'petugas@example.test', 'counter_id' => $counter->id]);
    $this->post('/admin/master/users', array_replace($payload, ['email' => 'other@example.test', 'branch_id' => Branch::where('code', 'KAL')->firstOrFail()->id]))->assertSessionHasErrors('counter_id');
    $this->post('/admin/master/users/'.$admin->id, ['name' => $admin->name, 'email' => $admin->email, 'role_id' => 'admin', 'is_active' => false])->assertSessionHasErrors('role_id');
});

test('master forms reject a duplicate service prefix and cyclic branch hierarchy', function () {
    [$admin, $branch, $service] = provisionQueue();
    $child = Branch::where('code', 'KAL')->firstOrFail();

    $this->actingAs($admin)->post('/admin/master/services', ['name' => 'Layanan lain', 'code' => 'OTHER', 'prefix' => $service->prefix, 'estimated_duration' => 10, 'priority' => 1, 'is_active' => true])->assertSessionHasErrors('prefix');
    $this->post('/admin/master/branches/'.$branch->id, ['name' => $branch->name, 'code' => $branch->code, 'address' => $branch->address, 'parent_id' => $child->id, 'is_active' => true])->assertSessionHasErrors('parent_id');

    $this->assertDatabaseMissing('queue_services', ['code' => 'OTHER']);
    $this->assertDatabaseHas('branches', ['id' => $branch->id, 'parent_id' => null]);
});

test('CSV export respects the selected status filter', function () {
    [$admin, $branch, $service] = provisionQueue();
    issueQueueTicket($branch, $service);

    $response = $this->actingAs($admin)->get('/admin/reports/history?export=1&status=COMPLETED&branch_id='.$branch->id)->assertOk();

    expect($response->streamedContent())->not->toContain('E001');
});

test('master data cannot be disabled while its queue is outstanding', function () {
    [$admin, $branch, $service] = provisionQueue();
    issueQueueTicket($branch, $service);

    $this->actingAs($admin)->post('/admin/master/branches/'.$branch->id, ['name' => $branch->name, 'code' => $branch->code, 'address' => $branch->address, 'parent_id' => null, 'is_active' => false])->assertSessionHasErrors('is_active');

    $this->assertDatabaseHas('branches', ['id' => $branch->id, 'is_active' => true]);
});
