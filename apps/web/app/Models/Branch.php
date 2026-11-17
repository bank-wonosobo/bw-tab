<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property string $id
 * @property ?string $parent_id
 * @property string $code
 * @property string $name
 * @property string $address
 * @property bool $is_active
 * @property ?string $bank_code
 * @property string $slug
 */
class Branch extends Model
{
    use HasUuids;

    protected $table = 'branches';

    protected $fillable = ['parent_id', 'code', 'name', 'address', 'is_active', 'bank_code', 'slug'];

    protected function casts(): array
    {
        return ['is_active' => 'boolean'];
    }

    /** @return BelongsTo<Branch, $this> */
    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    /** @return HasMany<Branch, $this> */
    public function children(): HasMany
    {
        return $this->hasMany(self::class, 'parent_id');
    }

    /** @return HasMany<ServiceCounter, $this> */
    public function counters(): HasMany
    {
        return $this->hasMany(ServiceCounter::class);
    }

    /** @return HasMany<QueueSession, $this> */
    public function sessions(): HasMany
    {
        return $this->hasMany(QueueSession::class);
    }
}
