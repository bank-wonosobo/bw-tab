<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('branchs') && ! Schema::hasTable('branches')) {
            Schema::rename('branchs', 'branches');
        }

        Schema::table('branches', function (Blueprint $table): void {
            $table->foreignUuid('parent_id')->nullable()->after('id')->constrained('branches')->nullOnDelete();
        });

        Schema::create('queue_services', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->string('code', 20)->unique();
            $table->string('name', 100);
            $table->string('prefix', 5);
            $table->text('description')->nullable();
            $table->unsignedInteger('estimated_duration')->default(10);
            $table->unsignedInteger('priority')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        Schema::create('service_counters', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->string('code', 20);
            $table->string('name', 100);
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->unique(['branch_id', 'code']);
        });

        Schema::create('counter_services', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('counter_id')->constrained('service_counters')->cascadeOnDelete();
            $table->foreignUuid('service_id')->constrained('queue_services')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['counter_id', 'service_id']);
        });

        Schema::create('queue_sessions', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('branch_id')->constrained('branches')->cascadeOnDelete();
            $table->date('business_date');
            $table->string('status', 20)->default('OPEN');
            $table->timestamp('opened_at')->nullable();
            $table->timestamp('closed_at')->nullable();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('closed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->unique(['branch_id', 'business_date']);
        });

        Schema::create('queue_sequences', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('queue_sessions')->cascadeOnDelete();
            $table->foreignUuid('service_id')->constrained('queue_services')->cascadeOnDelete();
            $table->unsignedBigInteger('last_number')->default(0);
            $table->timestamps();
            $table->unique(['session_id', 'service_id']);
        });

        Schema::create('queue_tickets', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('session_id')->constrained('queue_sessions')->cascadeOnDelete();
            $table->foreignUuid('service_id')->constrained('queue_services')->restrictOnDelete();
            $table->unsignedBigInteger('ticket_number');
            $table->string('ticket_code', 20);
            $table->string('source', 20)->default('KIOSK');
            $table->string('customer_name', 150)->nullable();
            $table->string('customer_reference', 100)->nullable();
            $table->unsignedSmallInteger('priority')->default(0);
            $table->string('status', 20)->default('WAITING');
            $table->timestamp('issued_at');
            $table->timestamp('called_at')->nullable();
            $table->timestamp('started_at')->nullable();
            $table->timestamp('completed_at')->nullable();
            $table->timestamp('cancelled_at')->nullable();
            $table->timestamps();
            $table->unique(['session_id', 'ticket_code']);
            $table->index(['session_id', 'status', 'priority', 'issued_at']);
        });

        Schema::create('queue_calls', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained('queue_tickets')->cascadeOnDelete();
            $table->foreignUuid('counter_id')->constrained('service_counters')->restrictOnDelete();
            $table->foreignId('called_by')->nullable()->constrained('users')->nullOnDelete();
            $table->unsignedInteger('call_number');
            $table->timestamp('called_at');
            $table->string('response_status', 20)->default('CALLED');
            $table->timestamps();
            $table->unique(['ticket_id', 'call_number']);
        });

        Schema::create('queue_ticket_events', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('ticket_id')->constrained('queue_tickets')->cascadeOnDelete();
            $table->string('event_type', 30);
            $table->string('previous_status', 20)->nullable();
            $table->string('new_status', 20)->nullable();
            $table->foreignId('actor_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignUuid('counter_id')->nullable()->constrained('service_counters')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->index(['ticket_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('queue_ticket_events');
        Schema::dropIfExists('queue_calls');
        Schema::dropIfExists('queue_tickets');
        Schema::dropIfExists('queue_sequences');
        Schema::dropIfExists('queue_sessions');
        Schema::dropIfExists('counter_services');
        Schema::dropIfExists('service_counters');
        Schema::dropIfExists('queue_services');

        Schema::table('branches', function (Blueprint $table): void {
            $table->dropForeign(['parent_id']);
            $table->dropColumn('parent_id');
        });

        if (Schema::hasTable('branches') && ! Schema::hasTable('branchs')) {
            Schema::rename('branches', 'branchs');
        }
    }
};
