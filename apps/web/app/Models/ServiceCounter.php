<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property string $branch_id
 * @property string $name
 * @property bool $is_active
 */
class ServiceCounter extends Model
{
    use HasUuids;

    protected $fillable = ['branch_id', 'code', 'name', 'description', 'is_active'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsTo<Branch, $this> */
    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    /** @return BelongsToMany<QueueService, $this, CounterService> */
    public function services(): BelongsToMany
    {
        return $this->belongsToMany(QueueService::class, 'counter_services', 'counter_id', 'service_id')->using(CounterService::class)->withTimestamps();
    }

    /** @return HasMany<QueueCall, $this> */
    public function calls(): HasMany
    {
        return $this->hasMany(QueueCall::class, 'counter_id');
    }
}
