<?php

$bankSlipBaseUrl = rtrim((string) env('BANK_SLIP_BASE_URL', 'https://api.bw.com:3232'), '/');

return [
    'bank_slip' => [
        'base_url' => $bankSlipBaseUrl,
        'branch_code' => env('BANK_SLIP_BRANCH_CODE', '01'),
        'token' => env('BANK_SLIP_TOKEN'),
        'products' => [
            'tabungan' => ['url' => env('BANK_SLIP_TABUNGAN_URL', $bankSlipBaseUrl.'/slip/tabungan'), 'request_field' => 'noTab', 'response_field' => 'NoTab'],
            'deposito' => ['url' => env('BANK_SLIP_DEPOSITO_URL', $bankSlipBaseUrl.'/slip/deposito'), 'request_field' => env('BANK_SLIP_DEPOSITO_REQUEST_FIELD', 'noDep'), 'response_field' => env('BANK_SLIP_DEPOSITO_RESPONSE_FIELD', 'NoDep')],
            'pinjaman' => ['url' => env('BANK_SLIP_PINJAMAN_URL', $bankSlipBaseUrl.'/slip/pinjaman'), 'request_field' => env('BANK_SLIP_PINJAMAN_REQUEST_FIELD', 'noPjm'), 'response_field' => env('BANK_SLIP_PINJAMAN_RESPONSE_FIELD', 'NoPjm')],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
