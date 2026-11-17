<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class CreateAdminSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $admin = User::query()->firstOrCreate(['email' => 'admin@bankwonosobo.test'], [
            'name' => 'Administrator BW TAB',
            'password' => 'password',
            'role_id' => 'admin',
            'is_active' => true,
        ]);
    }
}
