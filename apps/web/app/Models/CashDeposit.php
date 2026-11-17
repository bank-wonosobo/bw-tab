<?php

namespace App\Models;

use Carbon\CarbonInterface;
use Database\Factories\CashDepositFactory;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property string $id
 * @property string $transaction_type
 * @property string $account_number
 * @property string $account_reference
 * @property string $customer_name
 * @property string $amount
 * @property CarbonInterface $verified_at
 */
class CashDeposit extends Model
{
    /** @use HasFactory<CashDepositFactory> */
    use HasFactory, HasUuids;

    protected $fillable = ['transaction_type', 'bank_branch_code', 'account_number', 'account_reference', 'customer_id', 'customer_name', 'customer_address', 'sender_name', 'sender_address', 'amount', 'notes', 'source_of_funds', 'transaction_purpose', 'verified_at'];

    protected function casts(): array
    {
        return [
            'account_number' => 'encrypted', 'account_reference' => 'encrypted', 'customer_id' => 'encrypted',
            'customer_name' => 'encrypted', 'customer_address' => 'encrypted', 'sender_name' => 'encrypted',
            'sender_address' => 'encrypted', 'notes' => 'encrypted', 'source_of_funds' => 'encrypted',
            'transaction_purpose' => 'encrypted', 'amount' => 'decimal:2', 'verified_at' => 'immutable_datetime',
        ];
    }

    /** @return BelongsTo<QueueTicket, $this> */
    public function ticket(): BelongsTo
    {
        return $this->belongsTo(QueueTicket::class);
    }
}
