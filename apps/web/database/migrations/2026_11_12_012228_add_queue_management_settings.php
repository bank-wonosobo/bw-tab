<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('roles', function (Blueprint $table): void {
            $table->string('id', 30)->primary();
            $table->string('name', 80);
            $table->json('permissions');
            $table->timestamps();
        });
        $now = now();
        foreach ([
            'admin' => ['Administrator', ['operate', 'reports', 'master', 'users', 'settings']],
            'supervisor' => ['Supervisor', ['operate', 'reports']],
            'officer' => ['Petugas', ['operate']],
        ] as $id => [$name, $permissions]) {
            DB::table('roles')->insert(['id' => $id, 'name' => $name, 'permissions' => json_encode($permissions), 'created_at' => $now, 'updated_at' => $now]);
        }
        Schema::table('users', function (Blueprint $table): void {
            $table->string('role_id', 30)->default('officer');
            $table->foreign('role_id')->references('id')->on('roles')->restrictOnDelete();
            $table->foreignUuid('branch_id')->nullable()->constrained('branches')->nullOnDelete();
            $table->foreignUuid('counter_id')->nullable()->constrained('service_counters')->nullOnDelete();
            $table->boolean('is_active')->default(true);
        });
        DB::table('users')->where('email', 'admin@bankwonosobo.test')->update(['role_id' => 'admin']);
        Schema::create('app_settings', function (Blueprint $table): void {
            $table->string('id', 30)->primary();
            $table->json('value');
            $table->timestamps();
        });
        Schema::table('queue_services', fn (Blueprint $table) => $table->unique('prefix'));
        Schema::table('queue_tickets', function (Blueprint $table): void {
            $table->foreignUuid('counter_id')->nullable()->constrained('service_counters')->restrictOnDelete();
            $table->uuid('request_id')->nullable()->unique();
            $table->unique(['session_id', 'service_id', 'ticket_number'], 'queue_ticket_sequence_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('queue_tickets', function (Blueprint $table): void {
            $table->dropUnique('queue_ticket_sequence_unique');
            $table->dropForeign(['counter_id']);
            $table->dropUnique(['request_id']);
            $table->dropColumn(['counter_id', 'request_id']);
        });
        Schema::dropIfExists('app_settings');
        Schema::table('queue_services', fn (Blueprint $table) => $table->dropUnique(['prefix']));
        Schema::table('users', function (Blueprint $table): void {
            $table->dropForeign(['role_id']);
            $table->dropForeign(['branch_id']);
            $table->dropForeign(['counter_id']);
            $table->dropColumn(['role_id', 'branch_id', 'counter_id', 'is_active']);
        });
        Schema::dropIfExists('roles');
    }
};
