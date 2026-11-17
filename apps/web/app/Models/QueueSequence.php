<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property int $last_number
 */
class QueueSequence extends Model
{
    use HasUuids;

    protected $fillable = ['session_id', 'service_id', 'last_number'];

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
}
