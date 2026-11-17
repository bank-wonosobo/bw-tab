<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * @property string $id
 * @property string $session_id
 * @property string $service_id
 * @property ?string $counter_id
 * @property int $ticket_number
 * @property int $priority
 * @property string $ticket_code
 * @property string $status
 * @property CarbonInterface $issued_at
 * @property ?CarbonInterface $called_at
 * @property ?CarbonInterface $started_at
 * @property ?CarbonInterface $completed_at
 * @property ?CarbonInterface $cancelled_at
 */
class QueueTicket extends Model
{
    use HasUuids;

    protected $hidden = ['request_id'];

    /** @return HasOne<CashDeposit, $this> */
    public function cashDeposit(): HasOne
    {
        return $this->hasOne(CashDeposit::class, 'ticket_id');
    }

    /** @return BelongsTo<ServiceCounter, $this> */
    public function counter(): BelongsTo
    {
        return $this->belongsTo(ServiceCounter::class);
    }

    protected $fillable = ['session_id', 'service_id', 'ticket_number', 'ticket_code', 'source', 'customer_name', 'customer_reference', 'priority', 'status', 'issued_at', 'called_at', 'started_at', 'completed_at', 'cancelled_at'];

    protected function casts(): array
    {
        return ['issued_at' => 'datetime', 'called_at' => 'datetime', 'started_at' => 'datetime', 'completed_at' => 'datetime', 'cancelled_at' => 'datetime'];
    }

    /** @return BelongsTo<QueueSession, $this> */
    public function session(): BelongsTo
    {
        return $this->belongsTo(QueueSession::class, 'session_id');
    }

    /** @return BelongsTo<QueueService, $this> */
    public function service(): BelongsTo
    {
        return $this->belongsTo(QueueService::class, 'service_id');
    }

    /** @return HasMany<QueueCall, $this> */
    public function calls(): HasMany
    {
        return $this->hasMany(QueueCall::class, 'ticket_id');
    }

    /** @return HasMany<QueueTicketEvent, $this> */
    public function events(): HasMany
    {
        return $this->hasMany(QueueTicketEvent::class, 'ticket_id');
    }
}
