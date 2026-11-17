<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\QueueService;
use App\Models\QueueSession;
use App\Models\QueueTicket;
use App\Models\ServiceCounter;
use App\Services\QueueManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AdminQueueController extends Controller
{
    public function index(Request $request, QueueManager $manager): Response|StreamedResponse
    {
        $filters = $request->validate([
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'date_from' => ['nullable', 'date_format:Y-m-d'],
            'date_to' => ['nullable', 'date_format:Y-m-d', 'after_or_equal:date_from'], 'status' => ['nullable', Rule::in(['WAITING', 'CALLED', 'SERVING', 'COMPLETED', 'SKIPPED', 'NO_SHOW', 'CANCELLED'])],
            'search' => ['nullable', 'string', 'max:100'], 'service_id' => ['nullable', 'uuid', 'exists:queue_services,id'], 'counter_id' => ['nullable', 'uuid', 'exists:service_counters,id'],
        ]);
        $branch = $manager->branch($request->user(), $filters['branch_id'] ?? null);
        $from = $filters['date_from'] ?? today()->toDateString();
        $to = $filters['date_to'] ?? $from;
        $query = QueueTicket::whereHas('session', fn ($q) => $q->where('branch_id', $branch->id)->whereDate('business_date', '>=', $from)->whereDate('business_date', '<=', $to));
        $all = (clone $query)->with(['service:id,name', 'counter:id,name', 'events.actor:id,name'])->get();
        $query->when($filters['status'] ?? null, fn ($q, $v) => $q->where('status', $v))
            ->when($filters['service_id'] ?? null, fn ($q, $v) => $q->where('service_id', $v))
            ->when($filters['search'] ?? null, fn ($q, $v) => $q->where('ticket_code', 'like', '%'.$v.'%'));
        if ($request->boolean('export')) {
            abort_unless($request->user()->canManage('reports'), 403);

            return response()->streamDownload(function () use ($query): void {
                $out = fopen('php://output', 'w');
                if ($out === false) {
                    throw new \RuntimeException('Tidak dapat membuat laporan CSV.');
                }
                fputcsv($out, ['Nomor', 'Layanan', 'Status', 'Diambil', 'Dipanggil', 'Mulai', 'Selesai'], ',', '"', '');
                foreach ($query->with('service')->orderBy('issued_at')->cursor() as $ticket) {
                    $values = [$ticket->ticket_code, $ticket->service->name, $ticket->status, $ticket->issued_at, $ticket->called_at, $ticket->started_at, $ticket->completed_at];
                    fputcsv($out, array_map(fn ($value) => preg_match('/^[=+@\-]/', (string) $value) ? "'".$value : (string) $value, $values), ',', '"', '');
                }
                fclose($out);
            }, 'laporan-antrean.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
        }
        $counters = ServiceCounter::where('branch_id', $branch->id)->with('services:id,name')->orderBy('code')->get();
        $counterId = in_array($request->user()->role_id, ['officer', 'teller', 'cs'], true) ? $request->user()->counter_id : ($filters['counter_id'] ?? $counters->first()?->id);
        if ($request->route('mode') === 'calls' && $counterId) {
            $counterServiceIds = $counters->firstWhere('id', $counterId)?->services->pluck('id') ?? collect();
            $query->whereIn('service_id', $counterServiceIds);
        }
        $current = QueueTicket::where('counter_id', $counterId)->whereIn('status', ['CALLED', 'SERVING'])->whereHas('session', fn ($q) => $q->where('branch_id', $branch->id)->whereDate('business_date', today()))->with(['service', 'counter', 'cashDeposit'])->first();
        $completed = $all->filter(fn ($t) => $t->started_at && $t->completed_at);
        $waited = $all->filter(fn ($t) => $t->called_at !== null);

        return Inertia::render('admin/queue', [
            'mode' => $request->route('mode') ?? 'dashboard', 'branch' => $branch,
            'branches' => Branch::when($request->user()->role_id !== 'admin', fn ($q) => $q->whereKey($branch->id))->orderBy('code')->get(['id', 'name']),
            'filters' => ['date_from' => $from, 'date_to' => $to, 'status' => $filters['status'] ?? '', 'search' => $filters['search'] ?? '', 'service_id' => $filters['service_id'] ?? ''],
            'services' => QueueService::orderBy('priority')->get(), 'counters' => $counters, 'counterId' => $counterId, 'current' => $current,
            'session' => QueueSession::where('branch_id', $branch->id)->whereDate('business_date', today())->first(),
            'tickets' => $query->with(['service:id,name', 'counter:id,name', 'calls.counter:id,name', 'events.actor:id,name', 'cashDeposit'])->orderByDesc('issued_at')->orderByDesc('ticket_number')->paginate(15)->withQueryString(),
            'productivity' => [
                'counters' => $completed->groupBy('counter_id')->map(fn ($items) => ['name' => $items->first()->counter->name ?? 'Tanpa loket', 'total' => $items->count(), 'minutes' => round($items->avg(fn ($t) => $t->started_at->diffInSeconds($t->completed_at)) / 60, 1)])->values(),
                'officers' => $completed->map(fn ($t) => ['actor' => $t->events->firstWhere('event_type', 'SERVICE_COMPLETED')?->actor, 'seconds' => $t->started_at->diffInSeconds($t->completed_at)])
                    ->groupBy(fn ($item) => $item['actor']->id ?? 0)->map(fn ($items) => ['name' => $items->first()['actor']->name ?? 'Petugas tidak tersedia', 'total' => $items->count(), 'minutes' => round($items->avg('seconds') / 60, 1)])->values(),
            ],
            'stats' => ['total' => $all->count(), 'waiting' => $all->where('status', 'WAITING')->count(), 'serving' => $all->whereIn('status', ['CALLED', 'SERVING'])->count(), 'completed' => $all->where('status', 'COMPLETED')->count(), 'avg_service' => round($completed->avg(fn ($t) => $t->started_at->diffInSeconds($t->completed_at)) / 60, 1), 'avg_wait' => round($waited->avg(fn ($t) => $t->issued_at->diffInSeconds($t->called_at)) / 60, 1)],
            'report' => $all->groupBy('service_id')->map(fn ($items) => ['name' => $items->first()->service->name, 'total' => $items->count(), 'completed' => $items->where('status', 'COMPLETED')->count(), 'waiting' => $items->where('status', 'WAITING')->count(), 'avg_service' => round($items->filter(fn ($t) => $t->started_at && $t->completed_at)->avg(fn ($t) => $t->started_at->diffInSeconds($t->completed_at)) / 60, 1)])->values(),
        ]);
    }

    public function session(Request $request, QueueManager $manager): RedirectResponse
    {
        $data = $request->validate(['branch_id' => ['required', 'uuid'], 'action' => ['required', 'in:open,close']]);
        $manager->session($manager->branch($request->user(), $data['branch_id']), $request->user(), $data['action']);

        return back()->with('notice', 'Sesi antrean berhasil diperbarui.');
    }

    public function action(Request $request, QueueManager $manager): RedirectResponse
    {
        $data = $request->validate(['branch_id' => ['required', 'uuid'], 'counter_id' => ['nullable', 'uuid', 'exists:service_counters,id'], 'ticket_id' => ['required_unless:action,next', 'nullable', 'uuid'], 'action' => ['required', 'in:next,recall,start,complete,skip,no-show,requeue,cancel']]);
        $branch = $manager->branch($request->user(), $data['branch_id']);
        if (in_array($data['action'], ['requeue', 'cancel'], true)) {
            $manager->change($branch, $data['ticket_id'], $request->user(), $data['action']);
        } else {
            abort_unless(! empty($data['counter_id']), 422, 'Pilih loket pelayanan.');
            $manager->operate($branch, ServiceCounter::whereKey($data['counter_id'])->firstOrFail(), $request->user(), $data['action'], $data['ticket_id'] ?? null);
        }

        return back()->with('notice', 'Antrean berhasil diperbarui.');
    }

    public function updateDepositAmount(Request $request, QueueManager $manager): RedirectResponse
    {
        $data = $request->validate([
            'branch_id' => ['required', 'uuid'],
            'ticket_id' => ['required', 'uuid'],
            'amount' => ['required', 'string', 'regex:/^[1-9][0-9]{0,12}$/'],
        ], [
            'amount.regex' => 'Nominal harus berupa rupiah bulat lebih dari nol, maksimal 13 digit.',
        ]);
        $branch = $manager->branch($request->user(), $data['branch_id']);
        $ticket = QueueTicket::whereKey($data['ticket_id'])
            ->whereHas('session', fn ($query) => $query->where('branch_id', $branch->id))
            ->with('cashDeposit')
            ->firstOrFail();

        abort_unless($ticket->cashDeposit, 404, 'Data setoran tidak ditemukan.');
        $ticket->cashDeposit->update(['amount' => $data['amount']]);

        return back()->with('notice', 'Nominal setoran berhasil diperbarui.');
    }
}
