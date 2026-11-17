<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** @property array<string, mixed> $value */
class AppSetting extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'value'];

    protected function casts(): array
    {
        return ['value' => 'array'];
    }

    /** @return array<string, mixed> */
    public static function values(string $group): array
    {
        $defaults = $group === 'queue'
            ? ['digits' => 3, 'max_daily_tickets' => 1000]
            : ['title' => 'Bank Wonosobo', 'message' => 'Mohon menunggu hingga nomor antrean Anda dipanggil.', 'poll_seconds' => 5, 'sound' => true, 'video_url' => null];

        return array_replace($defaults, static::find($group)->value ?? []);
    }
}
