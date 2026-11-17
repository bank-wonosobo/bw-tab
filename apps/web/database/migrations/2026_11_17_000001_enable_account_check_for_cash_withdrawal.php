<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('queue_services')->where('code', 'TARIK_TUNAI')->update([
            'description' => 'Cek rekening dan isi nominal penarikan tunai.',
            'transaction_type' => 'tarik_tunai',
        ]);
    }

    public function down(): void
    {
        DB::table('queue_services')->where('code', 'TARIK_TUNAI')->update([
            'description' => 'Ambil nomor antrean langsung ke teller.',
            'transaction_type' => null,
        ]);
    }
};
