<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * @property string $id
 * @property string $branch_id
 * @property string $status
 * @property Carbon $business_date
 */
class QueueSession extends Model
{
    use HasUuids;

    protected $fillable = ['branch_id', 'business_date', 'status', 'opened_at', 'closed_at', 'opened_by', 'closed_by'];

    protected function casts(): array
    {
        return ['business_date' => 'date', 'opened_at' => 'datetime', 'closed_at' => 'datetime'];
    }

    /** @return BelongsTo<Branch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** @return HasMany<QueueSequence, $this> */
    public function sequences(): HasMany
    {
        return $this->hasMany(QueueSequence::class, 'session_id');
    }

    /** @return HasMany<QueueTicket, $this> */
    public function tickets(): HasMany
    {
        return $this->hasMany(QueueTicket::class, 'session_id');
    }
}
