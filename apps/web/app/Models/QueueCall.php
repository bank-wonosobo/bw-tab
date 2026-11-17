<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property int $call_number
 * @property ?int $called_by
 */
class QueueCall extends Model
{
    use HasUuids;

    protected $fillable = ['ticket_id', 'counter_id', 'called_by', 'call_number', 'called_at', 'response_status'];

    protected function casts(): array
    {
        return ['called_at' => 'datetime'];
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
