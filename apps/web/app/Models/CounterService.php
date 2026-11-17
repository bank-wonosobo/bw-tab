<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Relations\Pivot;

class CounterService extends Pivot
{
    use HasUuids;

    protected $table = 'counter_services';
}
