<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $code
 * @property string $name
 * @property string $prefix
 * @property bool $is_active
 * @property int $estimated_duration
 * @property ?string $transaction_type
 */
class QueueService extends Model
{
    use HasUuids;

    protected $fillable = ['code', 'name', 'prefix', 'description', 'estimated_duration', 'priority', 'is_active', 'transaction_type'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsToMany<ServiceCounter, $this, CounterService> */
    public function counters(): BelongsToMany
    {
        return $this->belongsToMany(ServiceCounter::class, 'counter_services', 'service_id', 'counter_id')->using(CounterService::class)->withTimestamps();
    }

    /** @return HasMany<QueueTicket, $this> */
    public function tickets(): HasMany
    {
        return $this->hasMany(QueueTicket::class, 'service_id');
    }

    /** @return HasMany<QueueSequence, $this> */
    public function sequences(): HasMany
    {
        return $this->hasMany(QueueSequence::class, 'service_id');
    }
}
