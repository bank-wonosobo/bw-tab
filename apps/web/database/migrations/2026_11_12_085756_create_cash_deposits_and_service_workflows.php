<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('branches', function (Blueprint $table): void {
            $table->string('bank_code', 20)->nullable();
            $table->string('slug', 120)->nullable()->unique();
        });
        foreach (DB::table('branches')->get(['id', 'name', 'code']) as $branch) {
            $slug = Str::slug($branch->name) ?: Str::slug($branch->code);
            if (DB::table('branches')->where('slug', $slug)->exists()) {
                $slug .= '-'.Str::lower($branch->code);
            }
            DB::table('branches')->where('id', $branch->id)->update(['slug' => $slug]);
        }
        DB::table('branches')->where('code', 'PST')->update(['bank_code' => '01']);
        Schema::table('queue_services', fn (Blueprint $table) => $table->string('transaction_type', 20)->nullable());
        foreach (['teller' => 'Teller', 'cs' => 'Customer Service'] as $id => $name) {
            DB::table('roles')->insertOrIgnore(['id' => $id, 'name' => $name, 'permissions' => json_encode(['operate']), 'created_at' => now(), 'updated_at' => now()]);
        }
        Schema::create('cash_deposits', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->unique()->constrained('queue_tickets')->restrictOnDelete();
            $table->string('transaction_type', 20);
            $table->string('bank_branch_code', 20);
            $table->text('account_number');
            $table->text('account_reference');
            $table->text('customer_id')->nullable();
            $table->text('customer_name');
            $table->text('customer_address')->nullable();
            $table->text('sender_name');
            $table->text('sender_address')->nullable();
            $table->decimal('amount', 18, 2);
            $table->text('notes')->nullable();
            $table->text('source_of_funds')->nullable();
            $table->text('transaction_purpose')->nullable();
            $table->timestamp('verified_at');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('cash_deposits');
        Schema::table('queue_services', fn (Blueprint $table) => $table->dropColumn('transaction_type'));
        Schema::table('branches', function (Blueprint $table): void {
            $table->dropUnique(['slug']);
            $table->dropColumn(['bank_code', 'slug']);
        });
    }
};
