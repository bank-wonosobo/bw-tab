<?php

use App\Http\Controllers\AccountLookupController;
use App\Http\Controllers\AdminMasterController;
use App\Http\Controllers\AdminQueueController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\QueueController;
use App\Http\Controllers\TabunganController;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'client/welcome')->name('home');
Route::get('/login', [AuthController::class, 'create'])->name('login')->middleware('guest');
Route::post('/login', [AuthController::class, 'store'])->middleware(['guest', 'throttle:10,1']);
Route::post('/logout', [AuthController::class, 'destroy'])->middleware('auth')->name('logout');
Route::get('/display', [QueueController::class, 'display'])->name('display');

Route::prefix('client')->as('client.')->group(function (): void {
    Route::inertia('/', 'client/welcome')->name('home');
    Route::get('/antrian', [QueueController::class, 'index'])->name('queue');
    Route::post('/antrian', [QueueController::class, 'store'])->middleware('throttle:30,1')->name('queue.store');
    Route::get('/tiket/{ticket}', [QueueController::class, 'show'])->name('ticket');
    Route::get('/tabungan', [TabunganController::class, 'index'])->name('tabungan');
    Route::redirect('/rekening', '/client/antrian')->name('rekening');
    Route::post('/{branch:slug}/rekening', [AccountLookupController::class, 'store'])->middleware('throttle:30,1')->name('account.lookup')->block(15, 15);
    Route::post('/{branch:slug}/antrian', [QueueController::class, 'store'])->middleware('throttle:30,1')->name('branch.store')->block(15, 15);
    Route::get('/{branch:slug}/antrian', [QueueController::class, 'index'])->name('branch.queue');
    Route::get('/{branch:slug}/setor/{service}', [QueueController::class, 'deposit'])->whereUuid('service')->name('branch.deposit');
    Route::get('/{branch:slug}', [QueueController::class, 'index'])->name('branch');
});

Route::prefix('admin')->as('admin.')->middleware(['auth', 'permission:operate'])->group(function (): void {
    Route::get('/', [AdminQueueController::class, 'index'])->name('dashboard');
    foreach (['monitor', 'tickets', 'calls'] as $mode) {
        Route::get('/queue/'.$mode, [AdminQueueController::class, 'index'])->defaults('mode', $mode)->name('queue.'.$mode);
    }
    Route::post('/queue/session', [AdminQueueController::class, 'session'])->name('session');
    Route::post('/queue/action', [AdminQueueController::class, 'action'])->name('action');
    Route::post('/queue/deposit/amount', [AdminQueueController::class, 'updateDepositAmount'])->name('deposit.amount');
    foreach (['statistics', 'service-time', 'history'] as $mode) {
        Route::get('/reports/'.$mode, [AdminQueueController::class, 'index'])->defaults('mode', $mode)->middleware('permission:reports')->name('reports.'.$mode);
    }
    Route::get('/master/{resource}', [AdminMasterController::class, 'index'])->name('master');
    Route::post('/master/{resource}/{id?}', [AdminMasterController::class, 'store'])->name('master.save');
    Route::get('/settings/users', [AdminMasterController::class, 'index'])->defaults('resource', 'users')->name('users');
    Route::get('/settings/{group}', [AdminMasterController::class, 'settings'])->name('settings');
    Route::post('/settings/{group}', [AdminMasterController::class, 'saveSettings'])->name('settings.save');
});
