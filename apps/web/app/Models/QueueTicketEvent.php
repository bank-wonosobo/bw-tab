<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 */
class QueueTicketEvent extends Model
{
    use HasUuids;

    public $timestamps = false;

    /** @return BelongsTo<User, $this> */
    public function actor(): BelongsTo
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    protected $fillable = ['ticket_id', 'event_type', 'previous_status', 'new_status', 'actor_id', 'counter_id', 'notes', 'created_at'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /** @return BelongsTo<QueueTicket, $this> */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(QueueTicket::class, 'ticket_id');
    }

    /** @return BelongsTo<ServiceCounter, $this> */
    public function counter(): BelongsTo
    {
        return $this->belongsTo(ServiceCounter::class, 'counter_id');
    }
}
