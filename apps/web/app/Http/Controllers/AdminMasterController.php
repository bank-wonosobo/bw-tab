<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\QueueService;
use App\Models\QueueTicket;
use App\Models\Role;
use App\Models\ServiceCounter;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AdminMasterController extends Controller
{
    private const MODELS = ['branches' => Branch::class, 'services' => QueueService::class, 'counters' => ServiceCounter::class, 'officers' => User::class, 'users' => User::class];

    private function authorizeResource(Request $request, string $resource): void
    {
        abort_unless(isset(self::MODELS[$resource]), 404);
        abort_unless($request->user()->role_id === 'admin', 403, 'Konfigurasi global hanya dapat dikelola administrator.');
        abort_unless($request->user()->canManage(in_array($resource, ['users', 'officers'], true) ? 'users' : 'master'), 403);
    }

    public function index(Request $request, string $resource): Response
    {
        $this->authorizeResource($request, $resource);

        return Inertia::render('admin/master', [
            'resource' => $resource, 'records' => self::MODELS[$resource]::when(in_array($resource, ['users', 'officers'], true), fn ($q) => $q->with('role'))->orderBy('name')->get(),
            'branches' => Branch::orderBy('name')->get(['id', 'name']), 'services' => QueueService::orderBy('name')->get(['id', 'name']),
            'counters' => ServiceCounter::with('services:id,name')->orderBy('name')->get(), 'roles' => Role::all(),
        ]);
    }

    public function store(Request $request, string $resource, ?string $id = null): RedirectResponse
    {
        $this->authorizeResource($request, $resource);
        $model = $id ? self::MODELS[$resource]::findOrFail($id) : new (self::MODELS[$resource]);
        $rules = ['name' => ['required', 'string', 'max:100'], 'is_active' => ['required', 'boolean']];
        if ($resource === 'branches') {
            $rules += ['code' => ['required', 'alpha_dash', 'max:20', Rule::unique('branches')->ignore($id)], 'address' => ['required', 'string', 'max:255'], 'parent_id' => ['nullable', 'uuid', 'exists:branches,id']];
        } elseif ($resource === 'services') {
            $rules += ['code' => ['required', 'alpha_dash', 'max:20', Rule::unique('queue_services')->ignore($id)], 'prefix' => ['required', 'regex:/^[A-Z]{1,5}$/', Rule::unique('queue_services')->ignore($id)], 'description' => ['nullable', 'string', 'max:2000'], 'estimated_duration' => ['required', 'integer', 'min:1', 'max:240'], 'priority' => ['required', 'integer', 'min:0', 'max:100']];
        } elseif ($resource === 'counters') {
            $rules += ['branch_id' => ['required', 'uuid', 'exists:branches,id'], 'code' => ['required', 'alpha_dash', 'max:20', Rule::unique('service_counters')->where('branch_id', $request->input('branch_id'))->ignore($id)], 'description' => ['nullable', 'string', 'max:2000'], 'service_ids' => ['required', 'array', 'min:1'], 'service_ids.*' => ['uuid', 'distinct', 'exists:queue_services,id']];
        } else {
            $rules += ['email' => ['required', 'email', 'max:255', Rule::unique('users')->ignore($id)], 'password' => [$id ? 'nullable' : 'required', 'string', 'min:8', 'max:128'], 'role_id' => ['required', 'exists:roles,id'], 'branch_id' => ['required_unless:role_id,admin', 'nullable', 'uuid', 'exists:branches,id'], 'counter_id' => ['required_if:role_id,officer', 'nullable', 'uuid', 'exists:service_counters,id']];
        }
        if ($resource === 'branches') {
            $request->merge(['slug' => $request->input('slug') ?: ($model->getAttribute('slug') ?: Str::slug($request->string('name')->toString()))]);
            $rules += ['slug' => ['required', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', 'not_in:antrian,rekening,tabungan,tiket', 'max:120', Rule::unique('branches')->ignore($id)], 'bank_code' => ['nullable', 'string', 'regex:/^[0-9]{1,20}$/']];
        }
        if ($resource === 'services') {
            $rules += ['transaction_type' => ['nullable', 'in:tabungan,deposito,pinjaman,tarik_tunai']];
        }
        $data = $request->validate($rules);
        if (in_array($resource, ['users', 'officers'], true) && in_array($data['role_id'], ['officer', 'teller', 'cs'], true) && empty($data['counter_id'])) {
            throw ValidationException::withMessages(['counter_id' => 'Pilih loket penugasan untuk petugas, teller, atau CS.']);
        }
        if ($model instanceof QueueService && $id && $model->prefix !== $data['prefix'] && $model->tickets()->exists()) {
            throw ValidationException::withMessages(['prefix' => 'Prefix layanan yang telah menerbitkan tiket tidak dapat diubah.']);
        }
        if ($resource === 'branches') {
            $parentId = $data['parent_id'] ?? null;
            $seen = [];
            while ($parentId) {
                if ($parentId === $id || in_array($parentId, $seen, true)) {
                    throw ValidationException::withMessages(['parent_id' => 'Hierarki cabang tidak boleh membentuk siklus.']);
                }
                $seen[] = $parentId;
                $parentId = Branch::whereKey($parentId)->first()?->parent_id;
            }
        }
        if (in_array($resource, ['users', 'officers'], true)) {
            if ($id && (int) $id === $request->user()->id && (! $data['is_active'] || $data['role_id'] !== 'admin') && $request->user()->role_id === 'admin') {
                throw ValidationException::withMessages(['role_id' => 'Administrator tidak dapat menonaktifkan atau menurunkan hak akses akun sendiri.']);
            }
            if (! empty($data['counter_id']) && ! ServiceCounter::whereKey($data['counter_id'])->where('branch_id', $data['branch_id'])->exists()) {
                throw ValidationException::withMessages(['counter_id' => 'Loket harus berada pada cabang yang dipilih.']);
            }
            if (empty($data['password'])) {
                unset($data['password']);
            }
        }
        DB::transaction(function () use ($model, $data, $id): void {
            if ($id && ! ($model instanceof User) && ! $data['is_active']) {
                $active = QueueTicket::whereIn('status', ['WAITING', 'CALLED', 'SERVING'])
                    ->whereHas('session', fn ($q) => $q->whereDate('business_date', today()));
                if ($model instanceof Branch) {
                    $active->whereHas('session', fn ($q) => $q->where('branch_id', $model->id));
                } elseif ($model instanceof ServiceCounter) {
                    $active->where('counter_id', $model->id);
                } else {
                    $active->where('service_id', $model->id);
                }
                if ($active->exists()) {
                    throw ValidationException::withMessages(['is_active' => 'Selesaikan atau batalkan tiket aktif terlebih dahulu sebelum menonaktifkan data.']);
                }
            }
            if ($model instanceof ServiceCounter && $id && $model->branch_id !== $data['branch_id'] && $model->calls()->exists()) {
                throw ValidationException::withMessages(['branch_id' => 'Loket yang sudah memiliki riwayat tidak dapat dipindahkan cabang.']);
            }
            $model->fill(Arr::except($data, ['service_ids']))->save();
            if ($model instanceof ServiceCounter) {
                $model->services()->sync($data['service_ids']);
            }
        });

        return back()->with('notice', 'Data berhasil disimpan.');
    }

    public function settings(Request $request, string $group): Response
    {
        abort_unless(in_array($group, ['queue', 'display', 'roles'], true), 404);
        abort_unless($request->user()->role_id === 'admin', 403);
        abort_unless($request->user()->canManage('settings'), 403);

        return Inertia::render('admin/settings', ['group' => $group, 'settings' => $group === 'roles' ? [] : AppSetting::values($group), 'roles' => Role::all()]);
    }

    public function saveSettings(Request $request, string $group): RedirectResponse
    {
        abort_unless(in_array($group, ['queue', 'display', 'roles'], true), 404);
        abort_unless($request->user()->role_id === 'admin', 403);
        abort_unless($request->user()->canManage('settings'), 403);
        if ($group === 'roles') {
            $data = $request->validate(['role_id' => ['required', 'in:supervisor,officer,teller,cs'], 'permissions' => ['required', 'array', Rule::contains(['operate'])], 'permissions.*' => ['in:operate,reports']]);
            Role::whereKey($data['role_id'])->firstOrFail()->update(['permissions' => $data['permissions']]);
        } else {
            $rules = $group === 'queue' ? ['digits' => ['required', 'integer', 'min:3', 'max:6'], 'max_daily_tickets' => ['required', 'integer', 'min:1', 'max:999999']]
                : ['title' => ['required', 'string', 'max:100'], 'message' => ['required', 'string', 'max:500'], 'poll_seconds' => ['required', 'integer', 'min:3', 'max:60'], 'sound' => ['required', 'boolean'], 'video_url' => ['nullable', 'url:http,https', 'max:2048']];
            AppSetting::updateOrCreate(['id' => $group], ['value' => $request->validate($rules)]);
        }

        return back()->with('notice', 'Pengaturan berhasil disimpan.');
    }
}
