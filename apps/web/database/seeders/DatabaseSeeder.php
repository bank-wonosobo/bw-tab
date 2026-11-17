<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\QueueSequence;
use App\Models\QueueService;
use App\Models\QueueSession;
use App\Models\ServiceCounter;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(['email' => 'admin@bankwonosobo.test'], [
            'name' => 'Administrator BW TAB',
            'password' => 'password',
            'role_id' => 'admin',
            'is_active' => true,
        ]);

        $pusat = Branch::query()->updateOrCreate(['code' => 'PST'], [
            'name' => 'Kantor Pusat',
            'slug' => Branch::where('code', 'PST')->value('slug') ?: 'kantor-pusat',
            'bank_code' => Branch::where('code', 'PST')->value('bank_code') ?? '01',
            'address' => 'Jl. Soebakri No. 12, Wonosobo',
            'is_active' => true,
        ]);
        $kaliwiro = Branch::query()->updateOrCreate(['code' => 'KAL'], [
            'parent_id' => $pusat->id,
            'name' => 'Cabang Kaliwiro',
            'slug' => Branch::where('code', 'KAL')->value('slug') ?: 'cabang-kaliwiro',
            'address' => 'Jl. Raya Kaliwiro',
            'is_active' => true,
        ]);
        $leksono = Branch::query()->updateOrCreate(['code' => 'LEK'], [
            'parent_id' => $pusat->id,
            'name' => 'Cabang Leksono',
            'slug' => Branch::where('code', 'LEK')->value('slug') ?: 'cabang-leksono',
            'address' => 'Jl. Magelang Km. 2',
            'is_active' => true,
        ]);

        $services = collect([
            ['code' => 'TELLER', 'name' => 'Setor Tabungan', 'prefix' => 'A', 'description' => 'Cek rekening dan isi nominal setoran tabungan.', 'transaction_type' => 'tabungan', 'estimated_duration' => 7, 'priority' => 1],
            ['code' => 'PEMBUKAAN', 'name' => 'Setor Deposito', 'prefix' => 'D', 'description' => 'Cek rekening dan isi nominal setoran deposito.', 'transaction_type' => 'deposito', 'estimated_duration' => 10, 'priority' => 2],
            ['code' => 'KREDIT', 'name' => 'Setor Pinjaman', 'prefix' => 'C', 'description' => 'Cek rekening dan isi nominal pembayaran pinjaman.', 'transaction_type' => 'pinjaman', 'estimated_duration' => 10, 'priority' => 3],
            ['code' => 'TARIK_TUNAI', 'name' => 'Tarik Tunai', 'prefix' => 'E', 'description' => 'Cek rekening dan isi nominal penarikan tunai.', 'transaction_type' => 'tarik_tunai', 'estimated_duration' => 7, 'priority' => 4],
            ['code' => 'CS', 'name' => 'Customer Service', 'prefix' => 'B', 'description' => 'Ambil nomor antrean untuk layanan Customer Service.', 'transaction_type' => null, 'estimated_duration' => 12, 'priority' => 5],
        ])->mapWithKeys(function (array $data): array {
            return [$data['code'] => QueueService::query()->updateOrCreate(['code' => $data['code']], $data + ['is_active' => true])];
        });

        foreach ([$pusat, $kaliwiro, $leksono] as $branch) {
            foreach (['01' => 'Loket 01', '02' => 'Loket 02'] as $code => $name) {
                $counter = ServiceCounter::query()->updateOrCreate(
                    ['branch_id' => $branch->id, 'code' => $code],
                    ['name' => $name, 'description' => 'Loket pelayanan '.$code, 'is_active' => true],
                );
                $serviceIds = $code === '01'
                    ? [$services['TELLER']->id, $services['PEMBUKAAN']->id, $services['KREDIT']->id, $services['TARIK_TUNAI']->id]
                    : [$services['CS']->id];
                DB::table('counter_services')->insertOrIgnore(array_map(
                    fn (string $serviceId): array => [
                        'id' => (string) Str::uuid(),
                        'counter_id' => $counter->id,
                        'service_id' => $serviceId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ],
                    $serviceIds,
                ));
                $role = $code === '01' ? 'teller' : 'cs';
                User::query()->firstOrCreate(['email' => $role.'.'.strtolower($branch->code).'@bankwonosobo.test'], [
                    'name' => ($role === 'teller' ? 'Teller ' : 'CS ').$branch->name,
                    'password' => 'password', 'role_id' => $role, 'branch_id' => $branch->id, 'counter_id' => $counter->id, 'is_active' => true,
                ]);
            }

            $session = QueueSession::query()->firstOrCreate(
                ['branch_id' => $branch->id, 'business_date' => Carbon::today()],
                ['status' => 'OPEN', 'opened_at' => now(), 'opened_by' => $admin->id],
            );
            foreach ($services as $service) {
                QueueSequence::query()->firstOrCreate(['session_id' => $session->id, 'service_id' => $service->id], ['last_number' => 0]);
            }
        }

        User::query()->firstOrCreate(['email' => 'test@example.com'], [
            'name' => 'Test User',
            'password' => 'password',
        ]);
    }
}
