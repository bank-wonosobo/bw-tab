<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use App\Models\QueueService;
use App\Services\BankSlipClient;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;

class AccountLookupController extends Controller
{
    public function store(Request $request, BankSlipClient $client, Branch $branch): JsonResponse
    {
        $data = $request->validate([
            'service_id' => ['required', 'uuid', 'exists:queue_services,id'],
            'account_number' => ['required', 'string', 'regex:/^[0-9]{5,30}$/'], 'request_id' => ['required', 'uuid'],
        ], ['account_number.regex' => 'Nomor rekening harus terdiri dari 5–30 angka.']);
        abort_unless($branch->is_active, 404);
        $service = QueueService::whereKey($data['service_id'])->where('is_active', true)->firstOrFail();
        $bankCode = (string) config('services.bank_slip.branch_code');
        if (! $bankCode || ! $service->transaction_type) {
            throw ValidationException::withMessages(['account_number' => 'Kode cabang API atau jenis setoran belum dikonfigurasi. Hubungi petugas.']);
        }
        if (! $branch->sessions()->whereDate('business_date', today())->where('status', 'OPEN')->exists()
            || ! $service->counters()->where('branch_id', $branch->id)->where('service_counters.is_active', true)->exists()) {
            throw ValidationException::withMessages(['account_number' => 'Layanan atau sesi antrean cabang belum tersedia.']);
        }
        $request->session()->forget('bank_lookups.'.$data['request_id']);
        $account = $client->lookup($service->transaction_type, $bankCode, $data['account_number']);
        $lookups = $request->session()->get('bank_lookups', []);
        $lookups = array_filter($lookups, fn ($item) => $item['expires_at'] >= now()->timestamp);
        $snapshot = [
            'branch_id' => $branch->id, 'service_id' => $service->id, 'bank_code' => $bankCode, 'account_number' => $data['account_number'], 'transaction_type' => $service->transaction_type,
            'account' => $account, 'expires_at' => now()->addMinutes(10)->timestamp, 'verified_at' => now()->toIso8601String(),
        ];
        $lookups[$data['request_id']] = ['expires_at' => $snapshot['expires_at'], 'data' => Crypt::encrypt($snapshot)];
        $request->session()->put('bank_lookups', array_slice($lookups, -10, null, true));

        return response()->json(['account' => $account])->header('Cache-Control', 'no-store, private');
    }
}
