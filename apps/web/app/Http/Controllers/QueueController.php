<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\QueueCall;
use App\Models\QueueService;
use App\Models\QueueSession;
use App\Models\QueueTicket;
use App\Models\ServiceCounter;
use App\Services\DepositIntake;
use App\Services\QueueManager;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class QueueController extends Controller
{
    public function index(?Branch $branch = null): Response|RedirectResponse
    {
        if (! $branch || ! $branch->exists) {
            $branch = Branch::where('is_active', true)->orderByRaw('CASE WHEN parent_id IS NULL THEN 0 ELSE 1 END')->orderBy('code')->firstOrFail();

            return redirect()->route('client.branch', ['branch' => $branch->slug]);
        }
        abort_unless($branch->is_active, 404);
        $branchId = $branch->id;

        return Inertia::render('client/queue', [
            'branches' => collect([$branch]),
            'branch' => $branch,
            'services' => QueueService::where('is_active', true)->orderBy('priority')->get(),
            'availability' => ServiceCounter::where('branch_id', $branchId)->where('is_active', true)->with('services:id')->get()->map(fn ($counter) => ['branch_id' => $counter->branch_id, 'service_ids' => $counter->services->pluck('id')]),
            'sessions' => QueueSession::where('branch_id', $branchId)->whereDate('business_date', today())->get(['branch_id', 'status']),
            'waiting' => QueueTicket::where('status', 'WAITING')->whereHas('session', fn ($q) => $q->where('branch_id', $branchId)->whereDate('business_date', today()))->get(['id', 'service_id'])->map(fn ($ticket) => ['branch_id' => $branchId, 'service_id' => $ticket->service_id]),
        ]);
    }

    public function deposit(Branch $branch, QueueService $service): Response
    {
        abort_unless($branch->is_active && $service->is_active && $service->transaction_type, 404);
        abort_unless($service->counters()->where('branch_id', $branch->id)->where('service_counters.is_active', true)->exists(), 404);

        return Inertia::render('client/deposit', [
            'branch' => $branch,
            'service' => $service,
            'bankCode' => config('services.bank_slip.branch_code'),
            'isOpen' => $branch->sessions()->whereDate('business_date', today())->where('status', 'OPEN')->exists(),
        ]);
    }

    public function store(Request $request, QueueManager $manager, DepositIntake $intake, ?Branch $branch = null): RedirectResponse
    {
        $data = $request->validate(['branch_id' => ['required', 'uuid', 'exists:branches,id'], 'service_id' => ['required', 'uuid', 'exists:queue_services,id'], 'request_id' => ['required', 'uuid']]);
        $selectedBranch = Branch::whereKey($data['branch_id'])->firstOrFail();
        abort_if($branch && $branch->exists && $branch->id !== $selectedBranch->id, 404);
        $service = QueueService::whereKey($data['service_id'])->where('is_active', true)->firstOrFail();
        $existing = QueueTicket::where('request_id', $data['request_id'])->first();
        if ($existing) {
            abort_unless(in_array($existing->id, $request->session()->get('queue_tickets', []), true), 404);
        }
        $deposit = $existing ? null : $intake->prepare($request, $selectedBranch, $service);
        $ticket = $manager->issue($data, $deposit);
        $owned = $request->session()->get('queue_tickets', []);
        $owned[] = $ticket->id;
        $request->session()->put('queue_tickets', array_slice(array_unique($owned), -30));

        return redirect()->route('client.ticket', $ticket);
    }

    public function show(Request $request, QueueTicket $ticket): Response
    {
        abort_unless(in_array($ticket->id, $request->session()->get('queue_tickets', []), true), 404);
        $ticket->load(['service', 'session.branch', 'counter']);
        $ahead = QueueTicket::where('session_id', $ticket->session_id)->where('service_id', $ticket->service_id)->where('status', 'WAITING')->where(function ($q) use ($ticket): void {
            $q->where('priority', '>', $ticket->priority)->orWhere(fn ($q) => $q->where('priority', $ticket->priority)->where('ticket_number', '<', $ticket->ticket_number));
        })->count();

        return Inertia::render('client/ticket', ['ticket' => $ticket, 'ahead' => $ahead]);
    }

    public function display(Request $request): Response
    {
        $branches = Branch::where('is_active', true)->orderBy('code')->get(['id', 'name']);
        $request->validate(['branch_id' => ['nullable', 'uuid', 'exists:branches,id']]);
        $branchId = $request->query('branch_id', $branches->first()?->id);
        $calls = QueueCall::whereHas('ticket.session', fn ($q) => $q->where('branch_id', $branchId)->whereDate('business_date', today()))->with(['ticket:id,ticket_code,status', 'counter:id,name,code'])->latest('called_at')->orderByDesc('id')->limit(8)->get();
        $currentTickets = QueueTicket::whereIn('status', ['CALLED', 'SERVING'])
            ->whereHas('session', fn ($q) => $q->where('branch_id', $branchId)->whereDate('business_date', today()))
            ->with('service:id,name')
            ->get(['id', 'counter_id', 'service_id', 'ticket_code', 'status'])
            ->keyBy('counter_id');
        $counters = ServiceCounter::where('branch_id', $branchId)->with('services:id,name')->orderBy('code')
            ->get(['id', 'name', 'is_active'])->map(fn (ServiceCounter $counter): array => [
                'id' => $counter->id,
                'name' => $counter->name,
                'is_active' => $counter->is_active,
                'services' => $counter->services->map(fn (QueueService $service): array => ['id' => $service->id, 'name' => $service->name]),
                'current' => $currentTickets->get($counter->id),
            ]);

        return Inertia::render('client/display', ['branches' => $branches, 'branchId' => $branchId, 'calls' => $calls, 'counters' => $counters, 'settings' => AppSetting::values('display')]);
    }
}
