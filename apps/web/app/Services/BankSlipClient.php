<?php

namespace App\Services;

use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class BankSlipClient
{
    /** @return array{customer_name: string, customer_address: string, account_reference: string, customer_id: ?string} */
    public function lookup(string $product, string $bankCode, string $accountNumber): array
    {
        $apiProduct = $product === 'tarik_tunai' ? 'tabungan' : $product;
        $config = config('services.bank_slip.products.'.$apiProduct);
        if (! is_array($config) || empty($config['url'])) {
            throw ValidationException::withMessages(['account_number' => 'Layanan cek rekening belum dikonfigurasi. Hubungi petugas.']);
        }
        $client = Http::acceptJson()->asJson()->connectTimeout(3)->timeout(10)->withoutRedirecting();
        if ($token = config('services.bank_slip.token')) {
            $client = $client->withToken($token);
        }
        try {
            $response = $client->post($config['url'], [
                'kodeCabang' => $bankCode,
                $config['request_field'] => $accountNumber,
                ...($apiProduct === 'pinjaman' ? ['nominal' => '0'] : ['setor' => '0', 'tarik' => '0']),
                'namaTrans' => '',
                'alamatTrans' => '',
                'keterangan' => '',
                ...($apiProduct === 'pinjaman' ? [] : ['sumberDana' => '', 'tujuanTransaksi' => '']),
            ]);
        } catch (ConnectionException) {
            Log::warning('Bank slip API tidak dapat dihubungi.', [
                'url' => $config['url'],
                'product' => $apiProduct,
            ]);
            throw ValidationException::withMessages(['account_number' => 'API rekening tidak dapat dihubungi. Silakan coba kembali.']);
        }
        if (! $response->successful()) {
            Log::warning('Bank slip API menolak pengecekan rekening.', [
                'url' => $config['url'],
                'product' => $apiProduct,
                'status' => $response->status(),
                'body' => substr($response->body(), 0, 1000),
            ]);
            throw ValidationException::withMessages(['account_number' => 'Pengecekan rekening gagal (HTTP '.$response->status().'). Silakan periksa nomor rekening atau hubungi petugas.']);
        }
        $body = $response->json();
        if (! is_array($body) || ! array_is_list($body) || count($body) !== 1 || ! is_array($body[0])) {
            Log::warning('Format respons bank slip tidak sesuai.', [
                'url' => $config['url'],
                'status' => $response->status(),
                'body_type' => get_debug_type($body),
                'body_is_list' => is_array($body) ? array_is_list($body) : null,
                'body_count' => is_array($body) ? count($body) : null,
                'body_keys' => is_array($body) ? array_keys($body) : null,
            ]);
            throw ValidationException::withMessages(['account_number' => 'Rekening tidak ditemukan atau respons API tidak valid.']);
        }
        $record = $body[0];
        $validator = Validator::make($record, [
            'KodeCabang' => ['required', 'string', 'max:20'], $config['response_field'] => ['required', 'string', 'max:100'],
            'Nama' => ['required', 'string', 'max:150'], 'Alamat' => ['nullable', 'string', 'max:2000'], 'NasabahID' => ['nullable', 'string', 'max:100'],
        ]);
        if ($validator->fails() || $record['KodeCabang'] !== $bankCode) {
            Log::warning('Field respons bank slip tidak sesuai.', [
                'url' => $config['url'],
                'status' => $response->status(),
                'response_keys' => array_keys($record),
                'expected_account_field' => $config['response_field'],
                'branch_matches' => ($record['KodeCabang'] ?? null) === $bankCode,
                'validation_errors' => $validator->errors()->keys(),
            ]);
            throw ValidationException::withMessages(['account_number' => 'Data rekening API tidak sesuai dengan cabang yang dipilih atau format respons tidak valid.']);
        }

        return [
            'customer_name' => $record['Nama'], 'customer_address' => $record['Alamat'] ?? '',
            'account_reference' => $record[$config['response_field']], 'customer_id' => $record['NasabahID'] ?? null,
        ];
    }
}
