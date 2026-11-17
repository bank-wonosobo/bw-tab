<?php

use App\Models\Branch;
use App\Models\QueueService;
use App\Models\QueueSession;
use App\Models\QueueTicket;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function setupCash(string $code = 'TELLER'): array
{
    test()->freezeTime();
    test()->withoutVite();
    test()->seed();
    Http::preventStrayRequests();

    return [Branch::where('code', 'PST')->firstOrFail(), QueueService::where('code', $code)->firstOrFail()];
}

function bankResponse(string $field = 'NoTab', string $reference = '10.01.01.55765'): array
{
    return [[
        'Tgl' => '12 November 2026', 'KodeCabang' => '01', $field => $reference, 'NasabahID' => '149087',
        'Nama' => 'NASABAH UJI', 'Alamat' => 'ALAMAT NASABAH UJI', 'NamaTrans' => 'NASABAH UJI', 'AlamatTrans' => 'ALAMAT NASABAH UJI',
        'Saldo' => 14242299, 'NoIdentitas' => 'IDENTITAS-RAHASIA', 'Nominal' => 0,
    ]];
}

function cashInput(Branch $branch, QueueService $service): array
{
    return ['branch_id' => $branch->id, 'service_id' => $service->id, 'request_id' => (string) Str::uuid(), 'account_number' => '10010155765',
        'amount' => '500000', 'sender_name' => 'PENYETOR UJI', 'sender_address' => 'ALAMAT PENYETOR',
        'notes' => 'Setoran hari ini', 'source_of_funds' => 'Gaji', 'transaction_purpose' => 'Menabung'];
}

test('lookup forwards the supplied savings contract and does not expose balance or identity', function () {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);

    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk()
        ->assertJsonPath('account.customer_name', 'NASABAH UJI')
        ->assertJsonPath('account.account_reference', '10.01.01.55765')
        ->assertDontSee('14242299')->assertDontSee('IDENTITAS-RAHASIA');

    Http::assertSent(fn ($request) => $request->method() === 'POST' && $request->data() === [
        'kodeCabang' => '01', 'noTab' => '10010155765', 'setor' => '0', 'tarik' => '0',
        'namaTrans' => '', 'alamatTrans' => '', 'keterangan' => '', 'sumberDana' => '', 'tujuanTransaksi' => '',
    ]);
    $this->assertDatabaseCount('queue_tickets', 0);
    $this->assertDatabaseCount('cash_deposits', 0);
});

test('all three deposit forms persist verified data and issue one linked ticket', function (string $code, string $product, string $requestField, string $responseField, string $ticketCode, string $accountNumber, string $reference) {
    [$branch, $service] = setupCash($code);
    Http::fake(['https://api.bw.com:3232/slip/'.$product => Http::response(bankResponse($responseField, $reference))]);
    $data = array_replace(cashInput($branch, $service), ['account_number' => $accountNumber]);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk()->assertJsonPath('account.account_reference', $reference);

    $this->post('/client/kantor-pusat/antrian', $data + ['customer_name' => 'NAMA PALSU', 'verified_at' => '2000-01-01'])->assertRedirect()->assertSessionHasNoErrors();

    $ticket = QueueTicket::firstOrFail();
    $deposit = $ticket->cashDeposit;
    expect($ticket->ticket_code)->toBe($ticketCode);
    expect($deposit->customer_name)->toBe('NASABAH UJI');
    expect($deposit->amount)->toBe('500000.00');
    expect($deposit->transaction_type)->toBe($product);
    expect($deposit->account_number)->toBe($accountNumber);
    expect($deposit->account_reference)->toBe($reference);
    Http::assertSent(fn ($request) => $request[$requestField] === $accountNumber && $request[$product === 'pinjaman' ? 'nominal' : 'setor'] === '0');
    expect(DB::table('cash_deposits')->value('account_number'))->not->toBe($accountNumber);
    expect(DB::table('cash_deposits')->value('customer_name'))->not->toBe('NASABAH UJI');
    $this->assertDatabaseCount('queue_ticket_events', 1);
    $this->assertDatabaseCount('cash_deposits', 1);
})->with([
    ['TELLER', 'tabungan', 'noTab', 'NoTab', 'A001', '10010155765', '10.01.01.55765'],
    ['PEMBUKAAN', 'deposito', 'noDep', 'NoDep', 'D001', '20200101419', '20.20.01.01419'],
    ['KREDIT', 'pinjaman', 'noPjm', 'NoPjm', 'C001', '30240103148', '30.24.01.03148'],
]);

test('loan lookup sends only the documented loan fields on port 3232', function () {
    [$branch, $service] = setupCash('KREDIT');
    Http::fake(['https://api.bw.com:3232/slip/pinjaman' => Http::response(bankResponse('NoPjm', '30.24.01.03148'))]);
    $data = array_replace(cashInput($branch, $service), ['account_number' => '30240103148']);

    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk()->assertJsonPath('account.account_reference', '30.24.01.03148');

    Http::assertSent(fn ($request) => $request->url() === 'https://api.bw.com:3232/slip/pinjaman' && $request->method() === 'POST' && $request->data() === [
        'kodeCabang' => '01', 'noPjm' => '30240103148', 'nominal' => '0',
        'namaTrans' => '', 'alamatTrans' => '', 'keterangan' => '',
    ]);
    $this->assertDatabaseCount('queue_tickets', 0);
});

test('deposit lookup uses noDep and reads NoDep on port 3232', function () {
    [$branch, $service] = setupCash('PEMBUKAAN');
    Http::fake(['https://api.bw.com:3232/slip/deposito' => Http::response(bankResponse('NoDep', '20.20.01.01419'))]);
    $data = array_replace(cashInput($branch, $service), ['account_number' => '20200101419']);

    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk()->assertJsonPath('account.account_reference', '20.20.01.01419');

    Http::assertSent(fn ($request) => $request->url() === 'https://api.bw.com:3232/slip/deposito' && $request->data() === [
        'kodeCabang' => '01', 'noDep' => '20200101419', 'setor' => '0', 'tarik' => '0',
        'namaTrans' => '', 'alamatTrans' => '', 'keterangan' => '', 'sumberDana' => '', 'tujuanTransaksi' => '',
    ]);
    $this->assertDatabaseCount('queue_tickets', 0);
});

test('deposit tickets cannot bypass account verification', function () {
    [$branch, $service] = setupCash();

    $this->post('/client/kantor-pusat/antrian', cashInput($branch, $service))->assertSessionHasErrors('account_number');

    $this->assertDatabaseCount('queue_tickets', 0);
    $this->assertDatabaseCount('cash_deposits', 0);
    Http::assertNothingSent();
});

test('changed account and expired verification cannot be submitted', function (bool $expired) {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();
    if ($expired) {
        $this->travel(11)->minutes();
    } else {
        $data['account_number'] = '99999999999';
    }

    $this->post('/client/kantor-pusat/antrian', $data)->assertSessionHasErrors('account_number');

    $this->assertDatabaseCount('queue_tickets', 0);
    $this->assertDatabaseCount('cash_deposits', 0);
})->with([true, false]);

test('invalid nominal is rejected without consuming a ticket number', function (string $amount) {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();

    $this->post('/client/kantor-pusat/antrian', array_replace($data, ['amount' => $amount]))->assertSessionHasErrors('amount');

    $this->assertDatabaseCount('cash_deposits', 0);
    $this->assertDatabaseMissing('queue_sequences', ['last_number' => 1]);
})->with(['0', '-100', '5e5', '500.25', '500,000', '10000000000000']);

test('API errors and invalid payloads never produce deposit records', function (array|string|null $body, int $status) {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response($body, $status)]);

    $this->postJson('/client/kantor-pusat/rekening', cashInput($branch, $service))->assertUnprocessable()->assertJsonValidationErrors('account_number');

    $this->assertDatabaseCount('cash_deposits', 0);
    $this->assertDatabaseCount('queue_tickets', 0);
})->with([[[], 200], [['error' => 'not found'], 200], ['invalid json', 200], [null, 500], [bankResponse(), 404]]);

test('connection failure is handled without leaking exception or creating ticket', function () {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::failedConnection()]);

    $this->postJson('/client/kantor-pusat/rekening', cashInput($branch, $service))->assertUnprocessable()->assertJsonValidationErrors('account_number')->assertDontSee('Guzzle');

    $this->assertDatabaseCount('queue_tickets', 0);
});

test('API code remains independent from branch configuration', function () {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);

    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();
    $branch->update(['bank_code' => null]);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();

    Http::assertSentCount(2);
});

test('customer service issues tickets without any form or API', function () {
    [$branch, $service] = setupCash('CS');

    $this->post('/client/kantor-pusat/antrian', ['branch_id' => $branch->id, 'service_id' => $service->id, 'request_id' => (string) Str::uuid()])->assertRedirect()->assertSessionHasNoErrors();

    $this->assertDatabaseHas('queue_tickets', ['ticket_code' => 'B001']);
    $this->assertDatabaseCount('cash_deposits', 0);
    Http::assertNothingSent();
});

test('cash withdrawal uses the account check form and persists a linked transaction', function () {
    [$branch, $service] = setupCash('TARIK_TUNAI');
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);

    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk()->assertJsonPath('account.account_reference', '10.01.01.55765');
    $this->post('/client/kantor-pusat/antrian', $data)->assertRedirect()->assertSessionHasNoErrors();

    $ticket = QueueTicket::firstOrFail();
    expect($ticket->ticket_code)->toBe('E001');
    expect($ticket->cashDeposit->transaction_type)->toBe('tarik_tunai');
    $this->assertDatabaseCount('cash_deposits', 1);
    Http::assertSent(fn ($request) => $request->url() === 'https://api.bw.com:3232/slip/tabungan' && $request['noTab'] === '10010155765');
});

test('double submit preserves one deposit and one ticket even after verification expires', function () {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();
    $this->post('/client/kantor-pusat/antrian', $data)->assertSessionHasNoErrors();
    $this->travel(11)->minutes();

    $this->post('/client/kantor-pusat/antrian', $data)->assertSessionHasNoErrors();

    $this->assertDatabaseCount('queue_tickets', 1);
    $this->assertDatabaseCount('cash_deposits', 1);
    Http::assertSentCount(1);
});

test('closing the session after lookup leaves no orphan deposit', function () {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();
    QueueSession::where('branch_id', $branch->id)->update(['status' => 'CLOSED']);

    $this->post('/client/kantor-pusat/antrian', $data)->assertSessionHasErrors('queue');

    $this->assertDatabaseCount('queue_tickets', 0);
    $this->assertDatabaseCount('cash_deposits', 0);
});

test('kiosk slug scopes its branch and rejects a different branch in the payload', function () {
    [$branch, $service] = setupCash('CS');
    $other = Branch::where('code', 'KAL')->firstOrFail();

    $this->get('/client/'.$other->slug)->assertOk()->assertInertia(fn (Assert $page) => $page->where('branch.id', $other->id)->has('branches', 1));
    $this->post('/client/'.$other->slug.'/antrian', cashInput($branch, $service))->assertNotFound();
    $this->get('/client/nonexistent-office')->assertNotFound();

    $this->assertDatabaseCount('queue_tickets', 0);
});

test('teller and CS can see branch deposits but cannot access another branch or another counter', function (string $role) {
    [$branch, $service] = setupCash();
    Http::fake(['https://api.bw.com:3232/slip/tabungan' => Http::response(bankResponse())]);
    $data = cashInput($branch, $service);
    $this->postJson('/client/kantor-pusat/rekening', $data)->assertOk();
    $this->post('/client/kantor-pusat/antrian', $data)->assertSessionHasNoErrors();
    $officer = User::where('email', $role.'.pst@bankwonosobo.test')->firstOrFail();
    $other = Branch::where('code', 'KAL')->firstOrFail();

    $this->actingAs($officer)->get('/admin/queue/tickets')->assertOk()->assertInertia(fn (Assert $page) => $page->where('tickets.data.0.cash_deposit.customer_name', 'NASABAH UJI')->where('tickets.data.0.cash_deposit.amount', '500000.00'));
    $this->get('/admin/queue/tickets?branch_id='.$other->id)->assertForbidden();
    $otherCounter = $branch->counters()->where('id', '!=', $officer->counter_id)->firstOrFail();
    $this->post('/admin/queue/action', ['branch_id' => $branch->id, 'counter_id' => $otherCounter->id, 'action' => 'next'])->assertForbidden();
    $this->get('/display?branch_id='.$branch->id)->assertDontSee('NASABAH UJI')->assertDontSee('10010155765');
})->with(['teller', 'cs']);

test('seed preserves kiosk addresses and bank branch codes configured by administrator', function () {
    [$branch] = setupCash();
    $branch->update(['slug' => 'kantor-operasional', 'bank_code' => '09']);

    $this->seed();

    $this->assertDatabaseHas('branches', ['id' => $branch->id, 'slug' => 'kantor-operasional', 'bank_code' => '09']);
});

test('branch slug cannot shadow the queue entrypoint', function () {
    [$branch] = setupCash();
    $admin = User::where('role_id', 'admin')->firstOrFail();

    $this->actingAs($admin)->post('/admin/master/branches/'.$branch->id, ['name' => $branch->name, 'code' => $branch->code, 'address' => $branch->address, 'slug' => 'antrian', 'is_active' => true])->assertSessionHasErrors('slug');

    $this->assertDatabaseHas('branches', ['id' => $branch->id, 'slug' => 'kantor-pusat']);
});

test('deposit services have their own form page scoped to the office', function (string $code) {
    [$branch, $service] = setupCash($code);

    $this->get('/client/'.$branch->slug.'/setor/'.$service->id)->assertOk()->assertInertia(fn (Assert $page) => $page
        ->component('client/deposit')->where('branch.id', $branch->id)->where('service.id', $service->id)->where('isOpen', true));

    $this->assertDatabaseCount('queue_tickets', 0);
    Http::assertNothingSent();
})->with(['TELLER', 'PEMBUKAAN', 'KREDIT']);

test('direct queue services cannot open a deposit form', function (string $code) {
    [$branch, $service] = setupCash($code);

    $this->get('/client/'.$branch->slug.'/setor/'.$service->id)->assertNotFound();

    Http::assertNothingSent();
})->with(['TARIK_TUNAI', 'CS']);

test('deposit form rejects a service unavailable at the selected office', function () {
    [$branch, $service] = setupCash();
    $service->counters()->where('branch_id', $branch->id)->get()->each(fn ($counter) => $counter->services()->detach($service->id));

    $this->get('/client/'.$branch->slug.'/setor/'.$service->id)->assertNotFound();

    Http::assertNothingSent();
});

test('closed queue session is shown on the deposit form without issuing a ticket', function () {
    [$branch, $service] = setupCash();
    QueueSession::where('branch_id', $branch->id)->update(['status' => 'CLOSED']);

    $this->get('/client/'.$branch->slug.'/setor/'.$service->id)->assertOk()->assertInertia(fn (Assert $page) => $page->component('client/deposit')->where('isOpen', false));

    $this->assertDatabaseCount('queue_tickets', 0);
});
