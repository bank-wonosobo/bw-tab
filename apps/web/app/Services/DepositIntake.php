<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\QueueService;
use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\ValidationException;

class DepositIntake
{
    /** @return array<string, mixed>|null */
    public function prepare(Request $request, Branch $branch, QueueService $service): ?array
    {
        if (! $service->transaction_type) {
            return null;
        }
        $transactionLabel = $service->transaction_type === 'tarik_tunai' ? 'penarikan' : 'setoran';
        $data = $request->validate([
            'account_number' => ['required', 'string', 'regex:/^[0-9]{5,30}$/'],
            'amount' => ['required', 'string', 'regex:/^[1-9][0-9]{0,12}$/'],
            'sender_name' => ['nullable', 'string', 'max:150'], 'sender_address' => ['nullable', 'string', 'max:2000'],
            'notes' => ['nullable', 'string', 'max:2000'], 'source_of_funds' => ['nullable', 'string', 'max:500'], 'transaction_purpose' => ['nullable', 'string', 'max:500'],
        ], ['account_number.required' => 'Masukkan nomor rekening.', 'account_number.regex' => 'Nomor rekening harus terdiri dari 5–30 angka.',
            'amount.required' => "Masukkan nominal {$transactionLabel}.", 'amount.regex' => 'Nominal harus berupa rupiah bulat lebih dari nol, maksimal 13 digit.']);
        $stored = $request->session()->get('bank_lookups.'.$request->input('request_id'));
        try {
            $lookup = is_array($stored) && is_string($stored['data'] ?? null) ? Crypt::decrypt($stored['data']) : null;
        } catch (DecryptException) {
            $lookup = null;
        }
        $bankCode = (string) config('services.bank_slip.branch_code');
        if (! is_array($lookup) || $lookup['expires_at'] < now()->timestamp || $lookup['branch_id'] !== $branch->id || $lookup['service_id'] !== $service->id || $lookup['bank_code'] !== $bankCode || $lookup['account_number'] !== $data['account_number'] || $lookup['transaction_type'] !== $service->transaction_type) {
            throw ValidationException::withMessages(['account_number' => 'Silakan cek ulang rekening sebelum mengambil nomor antrean. Hasil pengecekan berlaku 10 menit.']);
        }

        return [
            'transaction_type' => $service->transaction_type, 'bank_branch_code' => $bankCode,
            'account_number' => $data['account_number'], 'account_reference' => $lookup['account']['account_reference'],
            'customer_name' => $lookup['account']['customer_name'], 'customer_address' => $lookup['account']['customer_address'],
            'customer_id' => $lookup['account']['customer_id'],
            'sender_name' => ($data['sender_name'] ?? '') ?: $lookup['account']['customer_name'],
            'sender_address' => $data['sender_address'] ?? null, 'amount' => $data['amount'],
            'notes' => $data['notes'] ?? null, 'source_of_funds' => $data['source_of_funds'] ?? null, 'transaction_purpose' => $data['transaction_purpose'] ?? null,
            'verified_at' => $lookup['verified_at'],
        ];
    }
}
