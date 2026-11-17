<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\QueueSequence;
use App\Models\QueueService;
use App\Models\QueueSession;
use App\Models\QueueTicket;
use App\Models\ServiceCounter;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class QueueManager
{
    public function branch(User $user, ?string $id = null): Branch
    {
        $id = $id ?: $user->branch_id;
        if ($user->role_id !== 'admin') {
            abort_unless($user->branch_id && (! $id || $id === $user->branch_id), 403, 'Akses cabang tidak diizinkan.');
            $id = $user->branch_id;
        }

        return $id ? Branch::findOrFail($id) : Branch::orderBy('code')->firstOrFail();
    }

    public function session(Branch $branch, User $user, string $action): void
    {
        DB::transaction(function () use ($branch, $user, $action): void {
            Branch::whereKey($branch->id)->lockForUpdate()->firstOrFail();
            $session = QueueSession::firstOrCreate(['branch_id' => $branch->id, 'business_date' => today()], ['status' => 'CLOSED']);
            if ($action === 'open') {
                $this->ensure($branch->is_active, 'Cabang sedang tidak aktif.');
                if ($session->status !== 'OPEN') {
                    $session->update(['status' => 'OPEN', 'opened_at' => now(), 'opened_by' => $user->id, 'closed_at' => null, 'closed_by' => null]);
                }
            } else {
                $this->ensure(! $session->tickets()->whereIn('status', ['WAITING', 'CALLED', 'SERVING'])->exists(), 'Selesaikan atau batalkan seluruh antrean aktif sebelum menutup sesi.');
                $session->update(['status' => 'CLOSED', 'closed_at' => now(), 'closed_by' => $user->id]);
            }
        }, 5);
    }

    /**
     * @param  array{branch_id: string, service_id: string, request_id: string}  $data
     * @param  array<string, mixed>|null  $deposit
     */
    public function issue(array $data, ?array $deposit = null): QueueTicket
    {
        return DB::transaction(function () use ($data, $deposit): QueueTicket {
            $branch = Branch::whereKey($data['branch_id'])->lockForUpdate()->firstOrFail();
            $existing = QueueTicket::where('request_id', $data['request_id'])->first();
            if ($existing) {
                $this->ensure($existing->session->branch_id === $branch->id && $existing->service_id === $data['service_id'], 'Permintaan tiket tidak sesuai.');

                return $existing;
            }
            $this->ensure($branch->is_active, 'Cabang tidak aktif.');
            $session = QueueSession::where('branch_id', $branch->id)->whereDate('business_date', today())->where('status', 'OPEN')->first();
            $this->ensure((bool) $session, 'Sesi antrean cabang belum dibuka. Silakan hubungi petugas.');
            $service = QueueService::whereKey($data['service_id'])->where('is_active', true)->firstOrFail();
            $this->ensure(! $service->transaction_type || ($deposit && $deposit['transaction_type'] === $service->transaction_type), 'Lengkapi dan verifikasi formulir transaksi sebelum mengambil nomor antrean.');
            $this->ensure($service->counters()->where('branch_id', $branch->id)->where('service_counters.is_active', true)->exists(), 'Layanan belum tersedia di cabang ini.');
            $config = AppSetting::values('queue');
            $this->ensure($session->tickets()->count() < $config['max_daily_tickets'], 'Kuota antrean harian cabang telah tercapai.');
            $sequence = QueueSequence::firstOrCreate(['session_id' => $session->id, 'service_id' => $service->id], ['last_number' => 0]);
            $number = max((int) $sequence->last_number, (int) $session->tickets()->where('service_id', $service->id)->max('ticket_number')) + 1;
            $sequence->update(['last_number' => $number]);
            $ticket = new QueueTicket;
            $ticket->forceFill([
                'session_id' => $session->id, 'service_id' => $service->id,
                'ticket_number' => $number, 'ticket_code' => $service->prefix.str_pad((string) $number, $config['digits'], '0', STR_PAD_LEFT),
                'request_id' => $data['request_id'], 'source' => 'KIOSK', 'status' => 'WAITING', 'issued_at' => now(),
            ])->save();
            if ($service->transaction_type && $deposit !== null) {
                $ticket->cashDeposit()->create($deposit);
            }
            $ticket->events()->create(['event_type' => 'TICKET_CREATED', 'new_status' => 'WAITING', 'created_at' => now()]);

            return $ticket;
        }, 5);
    }

    public function operate(Branch $branch, ServiceCounter $counter, User $user, string $action, ?string $ticketId): ?QueueTicket
    {
        abort_unless($counter->branch_id === $branch->id, 404);
        if (in_array($user->role_id, ['officer', 'teller', 'cs'], true)) {
            abort_unless($user->counter_id === $counter->id, 403, 'Gunakan loket yang ditugaskan kepada Anda.');
        }

        return DB::transaction(function () use ($branch, $counter, $user, $action, $ticketId): ?QueueTicket {
            Branch::whereKey($branch->id)->lockForUpdate()->firstOrFail();
            $session = QueueSession::where('branch_id', $branch->id)->whereDate('business_date', today())->where('status', 'OPEN')->first();
            $this->ensure($session && $branch->is_active && $counter->is_active, 'Cabang, loket, atau sesi antrean tidak aktif.');
            if ($action === 'next') {
                $this->ensure(! $session->tickets()->where('counter_id', $counter->id)->whereIn('status', ['CALLED', 'SERVING'])->exists(), 'Selesaikan tiket yang sedang dilayani terlebih dahulu.');
                $ticket = $session->tickets()->where('status', 'WAITING')->whereIn('service_id', $counter->services()->where('is_active', true)->pluck('queue_services.id'))
                    ->orderByDesc('priority')->orderBy('issued_at')->orderBy('ticket_number')->lockForUpdate()->first();
                $this->ensure((bool) $ticket, 'Tidak ada antrean menunggu untuk layanan loket ini.');
            } else {
                $ticket = $session->tickets()->whereKey($ticketId)->lockForUpdate()->firstOrFail();
                $this->ensure($ticket->counter_id === $counter->id, 'Tiket ini ditangani loket lain.');
            }
            $previous = $ticket->status;
            $transitions = ['next' => ['WAITING', 'CALLED', 'TICKET_CALLED'], 'recall' => ['CALLED', 'CALLED', 'TICKET_RECALLED'], 'start' => ['CALLED', 'SERVING', 'SERVICE_STARTED'], 'complete' => ['SERVING', 'COMPLETED', 'SERVICE_COMPLETED'], 'skip' => ['CALLED', 'SKIPPED', 'TICKET_SKIPPED'], 'no-show' => ['CALLED', 'NO_SHOW', 'TICKET_NO_SHOW']];
            [$from, $to, $event] = $transitions[$action];
            $this->ensure($previous === $from, 'Status tiket sudah berubah. Segarkan halaman dan coba kembali.');
            $ticket->status = $to;
            $ticket->counter_id = $counter->id;
            if (in_array($action, ['next', 'recall'], true)) {
                $ticket->called_at ??= now();
                $ticket->calls()->create(['counter_id' => $counter->id, 'called_by' => $user->id, 'call_number' => $ticket->calls()->count() + 1, 'called_at' => now(), 'response_status' => 'CALLED']);
            }
            if ($action === 'start') {
                $ticket->started_at = now();
                $ticket->calls()->orderByDesc('call_number')->first()?->update(['response_status' => 'ANSWERED']);
            }
            if ($action === 'complete') {
                $ticket->completed_at = now();
            }
            if (in_array($action, ['skip', 'no-show'], true)) {
                $ticket->calls()->orderByDesc('call_number')->first()?->update(['response_status' => 'NO_SHOW']);
            }
            $ticket->save();
            $ticket->events()->create(['event_type' => $event, 'previous_status' => $previous, 'new_status' => $to, 'counter_id' => $counter->id, 'actor_id' => $user->id, 'created_at' => now()]);

            return $ticket;
        }, 5);
    }

    public function change(Branch $branch, string $ticketId, User $user, string $action): void
    {
        DB::transaction(function () use ($branch, $ticketId, $user, $action): void {
            Branch::whereKey($branch->id)->lockForUpdate()->firstOrFail();
            $ticket = QueueTicket::whereKey($ticketId)->whereHas('session', fn ($q) => $q->where('branch_id', $branch->id)->whereDate('business_date', today())->where('status', 'OPEN'))->lockForUpdate()->firstOrFail();
            $previous = $ticket->status;
            $this->ensure(in_array($previous, $action === 'requeue' ? ['SKIPPED', 'NO_SHOW'] : ['WAITING', 'CALLED'], true), 'Tiket tidak dapat diubah pada status ini.');
            $ticket->status = $action === 'requeue' ? 'WAITING' : 'CANCELLED';
            if ($action === 'requeue') {
                $ticket->counter_id = null;
            } else {
                $ticket->cancelled_at = now();
            }
            $ticket->save();
            $ticket->events()->create(['event_type' => $action === 'requeue' ? 'TICKET_REQUEUED' : 'TICKET_CANCELLED', 'previous_status' => $previous, 'new_status' => $ticket->status, 'actor_id' => $user->id, 'created_at' => now()]);
        }, 5);
    }

    private function ensure(bool $condition, string $message): void
    {
        if (! $condition) {
            throw ValidationException::withMessages(['queue' => $message]);
        }
    }
}
