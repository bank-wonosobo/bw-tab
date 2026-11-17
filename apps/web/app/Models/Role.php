<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** @property list<string> $permissions */
class Role extends Model
{
    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = ['id', 'name', 'permissions'];

    protected function casts(): array
    {
        return ['permissions' => 'array'];
    }
}
