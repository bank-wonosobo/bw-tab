<?php

namespace Database\Factories;

use App\Models\CashDeposit;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<CashDeposit>
 */
class CashDepositFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'transaction_type' => 'tabungan', 'bank_branch_code' => '01',
            'account_number' => '10010155765', 'account_reference' => '10.01.01.55765',
            'customer_name' => fake()->name(), 'customer_address' => fake()->address(),
            'sender_name' => fake()->name(), 'amount' => '500000', 'verified_at' => now(),
        ];
    }
}
