import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import type { Branch, Counter, Service } from '@/types/queue';
type RecordItem = {
    id: string;
    name: string;
    code?: string;
    slug?: string;
    bank_code?: string | null;
    transaction_type?: string | null;
    address?: string;
    parent_id?: string | null;
    is_active: boolean;
    prefix?: string;
    description?: string;
    estimated_duration?: number;
    priority?: number;
    branch_id?: string | null;
    counter_id?: string | null;
    role_id?: string;
    email?: string;
};
type Props = {
    resource: string;
    records: RecordItem[];
    branches: Branch[];
    counters: Counter[];
    services: Service[];
    roles: { id: string; name: string }[];
};
const names: Record<string, string> = {
    branches: 'Kantor / cabang',
    services: 'Layanan perbankan',
    counters: 'Loket pelayanan',
    users: 'Petugas & pengguna',
    officers: 'Petugas & pengguna',
};
export default function Master({
    resource,
    records,
    branches,
    counters,
    services,
    roles,
}: Props) {
    const [editing, setEditing] = useState<string | null>(null);
    const [visible, setVisible] = useState(false);
    const [search, setSearch] = useState('');
    const defaults = {
        name: '',
        code: '',
        slug: '',
        bank_code: '',
        transaction_type: '',
        address: '',
        parent_id: '',
        is_active: true,
        prefix: '',
        description: '',
        estimated_duration: 10,
        priority: 0,
        branch_id: branches[0]?.id ?? '',
        counter_id: '',
        role_id: 'officer',
        email: '',
        password: '',
        service_ids: [] as string[],
    };
    const form = useForm(defaults);
    const userResource = ['users', 'officers'].includes(resource);
    function edit(record?: RecordItem) {
        setEditing(record?.id ?? null);
        form.clearErrors();
        form.setData(
            record
                ? {
                      ...defaults,
                      ...record,
                      parent_id: record.parent_id ?? '',
                      bank_code: record.bank_code ?? '',
                      transaction_type: record.transaction_type ?? '',
                      branch_id: record.branch_id ?? '',
                      counter_id: record.counter_id ?? '',
                      service_ids:
                          counters
                              .find((c) => c.id === record.id)
                              ?.services.map((s) => s.id) ?? [],
                      password: '',
                  }
                : defaults,
        );
        setVisible(true);
    }
    const filtered = records.filter((r) =>
        [r.name, r.code, r.email].some((v) =>
            v?.toLowerCase().includes(search.toLowerCase()),
        ),
    );
    return (
        <AdminLayout>
            <Head title={names[resource]} />
            <div className="mx-auto max-w-6xl">
                <div className="mb-6 flex items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-widest text-primary">
                            MASTER DATA
                        </p>
                        <h1 className="mt-2 text-3xl font-bold">
                            {names[resource]}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Tambah, ubah, dan atur status aktif data
                            operasional.
                        </p>
                    </div>
                    <button className="action" onClick={() => edit()}>
                        + Tambah data
                    </button>
                </div>
                <section className="panel">
                    <input
                        aria-label="Cari data"
                        className="field mb-5 max-w-md"
                        placeholder="Cari nama, kode, atau email…"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="border-b bg-slate-50 text-xs text-slate-500">
                                <tr>
                                    {[
                                        'Nama',
                                        userResource ? 'Email / role' : 'Kode',
                                        resource === 'services'
                                            ? 'Estimasi'
                                            : resource === 'branches'
                                              ? 'Alamat'
                                              : 'Cabang',
                                        'Status',
                                        'Tindakan',
                                    ].map((t) => (
                                        <th className="p-3" key={t}>
                                            {t}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filtered.map((r) => (
                                    <tr key={r.id}>
                                        <td className="p-3 font-semibold">
                                            {r.name}
                                            {resource === 'branches' &&
                                                r.slug && (
                                                    <a
                                                        href={`/client/${r.slug}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="mt-1 block text-xs font-normal text-primary"
                                                    >
                                                        Kios: /client/{r.slug} ↗
                                                    </a>
                                                )}
                                        </td>
                                        <td className="p-3 text-slate-500">
                                            {userResource ? (
                                                <>
                                                    {r.email}
                                                    <span className="mt-1 block text-xs text-primary">
                                                        {
                                                            roles.find(
                                                                (role) =>
                                                                    role.id ===
                                                                    r.role_id,
                                                            )?.name
                                                        }
                                                    </span>
                                                </>
                                            ) : (
                                                r.code
                                            )}
                                        </td>
                                        <td className="p-3 text-slate-500">
                                            {resource === 'services'
                                                ? `${r.estimated_duration} menit · ${r.prefix}`
                                                : resource === 'branches'
                                                  ? r.address
                                                  : (branches.find(
                                                        (b) =>
                                                            b.id ===
                                                            r.branch_id,
                                                    )?.name ?? 'Semua cabang')}
                                        </td>
                                        <td className="p-3">
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-medium ${r.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                            >
                                                {r.is_active
                                                    ? 'Aktif'
                                                    : 'Nonaktif'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <button
                                                className="font-semibold text-primary"
                                                onClick={() => edit(r)}
                                            >
                                                Ubah
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {!filtered.length && (
                            <p className="py-12 text-center text-sm text-slate-400">
                                Belum ada data yang sesuai pencarian.
                            </p>
                        )}
                    </div>
                </section>
                {visible && (
                    <div
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Form master data"
                    >
                        <form
                            className="panel max-h-[90vh] w-full max-w-2xl overflow-auto"
                            onSubmit={(e) => {
                                e.preventDefault();
                                form.post(
                                    `/admin/master/${resource}${editing ? '/' + editing : ''}`,
                                    {
                                        onSuccess: () => {
                                            setVisible(false);
                                            form.reset();
                                        },
                                    },
                                );
                            }}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-xl font-bold">
                                    {editing ? 'Ubah data' : 'Tambah data'}
                                </h2>
                                <button
                                    type="button"
                                    aria-label="Tutup form"
                                    className="text-xl text-slate-500"
                                    onClick={() => setVisible(false)}
                                >
                                    ×
                                </button>
                            </div>
                            {Object.keys(form.errors).length > 0 && (
                                <div
                                    role="alert"
                                    className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                                >
                                    {Object.entries(form.errors).map(
                                        ([key, error]) => (
                                            <p key={key}>{error}</p>
                                        ),
                                    )}
                                </div>
                            )}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <label className="text-sm font-medium">
                                    Nama
                                    <input
                                        className="field mt-1"
                                        required
                                        value={form.data.name}
                                        onChange={(e) =>
                                            form.setData('name', e.target.value)
                                        }
                                    />
                                </label>
                                {!userResource && (
                                    <label className="text-sm font-medium">
                                        Kode
                                        <input
                                            className="field mt-1"
                                            required
                                            value={form.data.code}
                                            onChange={(e) =>
                                                form.setData(
                                                    'code',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                )}
                                {resource === 'branches' && (
                                    <>
                                        <label className="text-sm font-medium">
                                            Slug alamat kios
                                            <input
                                                className="field mt-1"
                                                placeholder="Contoh: kantor-pusat"
                                                value={form.data.slug}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'slug',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                            <span className="mt-1 block text-xs text-slate-500">
                                                Kosongkan untuk membuat dari
                                                nama kantor.
                                            </span>
                                        </label>
                                        <label className="text-sm font-medium">
                                            Kode cabang API
                                            <input
                                                className="field mt-1"
                                                inputMode="numeric"
                                                maxLength={20}
                                                placeholder="Contoh: 01"
                                                value={form.data.bank_code}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'bank_code',
                                                        e.target.value.replace(
                                                            /\D/g,
                                                            '',
                                                        ),
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="text-sm font-medium sm:col-span-2">
                                            Alamat
                                            <textarea
                                                className="field mt-1"
                                                required
                                                value={form.data.address}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'address',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="text-sm font-medium">
                                            Kantor induk
                                            <select
                                                className="field mt-1"
                                                value={form.data.parent_id}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'parent_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Tanpa induk
                                                </option>
                                                {branches
                                                    .filter(
                                                        (b) => b.id !== editing,
                                                    )
                                                    .map((b) => (
                                                        <option
                                                            key={b.id}
                                                            value={b.id}
                                                        >
                                                            {b.name}
                                                        </option>
                                                    ))}
                                            </select>
                                        </label>
                                    </>
                                )}
                                {resource === 'services' && (
                                    <>
                                        <label className="text-sm font-medium sm:col-span-2">
                                            Formulir sebelum antrean
                                            <select
                                                className="field mt-1"
                                                value={
                                                    form.data.transaction_type
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'transaction_type',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                <option value="">
                                                    Tanpa formulir (langsung
                                                    antrean)
                                                </option>
                                                <option value="tabungan">
                                                    Setor tabungan
                                                </option>
                                                <option value="deposito">
                                                    Setor deposito
                                                </option>
                                                <option value="pinjaman">
                                                    Setor pinjaman
                                                </option>
                                                <option value="tarik_tunai">
                                                    Tarik tunai
                                                </option>
                                            </select>
                                        </label>
                                        <label className="text-sm font-medium">
                                            Prefix nomor
                                            <input
                                                required
                                                className="field mt-1"
                                                maxLength={5}
                                                placeholder="A"
                                                value={form.data.prefix}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'prefix',
                                                        e.target.value.toUpperCase(),
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="text-sm font-medium">
                                            Estimasi layanan (menit)
                                            <input
                                                className="field mt-1"
                                                type="number"
                                                min={1}
                                                max={240}
                                                value={
                                                    form.data.estimated_duration
                                                }
                                                onChange={(e) =>
                                                    form.setData(
                                                        'estimated_duration',
                                                        Number(e.target.value),
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="text-sm font-medium">
                                            Urutan tampilan
                                            <input
                                                type="number"
                                                min={0}
                                                max={100}
                                                className="field mt-1"
                                                value={form.data.priority}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'priority',
                                                        Number(e.target.value),
                                                    )
                                                }
                                            />
                                        </label>
                                    </>
                                )}
                                {userResource && (
                                    <>
                                        <label className="text-sm font-medium">
                                            Email
                                            <input
                                                required
                                                type="email"
                                                className="field mt-1"
                                                value={form.data.email}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'email',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="text-sm font-medium">
                                            Kata sandi{' '}
                                            {editing &&
                                                '(kosongkan jika tetap)'}
                                            <input
                                                type="password"
                                                autoComplete="new-password"
                                                required={!editing}
                                                minLength={8}
                                                className="field mt-1"
                                                value={form.data.password}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'password',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </label>
                                        <label className="text-sm font-medium">
                                            Role
                                            <select
                                                className="field mt-1"
                                                value={form.data.role_id}
                                                onChange={(e) =>
                                                    form.setData(
                                                        'role_id',
                                                        e.target.value,
                                                    )
                                                }
                                            >
                                                {roles.map((r) => (
                                                    <option
                                                        key={r.id}
                                                        value={r.id}
                                                    >
                                                        {r.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </>
                                )}
                                {(resource === 'counters' || userResource) && (
                                    <label className="text-sm font-medium">
                                        Cabang
                                        <select
                                            className="field mt-1"
                                            required={
                                                form.data.role_id !== 'admin' ||
                                                resource === 'counters'
                                            }
                                            value={form.data.branch_id}
                                            onChange={(e) => {
                                                form.setData(
                                                    'branch_id',
                                                    e.target.value,
                                                );
                                                form.setData('counter_id', '');
                                            }}
                                        >
                                            <option value="">
                                                Semua cabang (admin)
                                            </option>
                                            {branches.map((b) => (
                                                <option key={b.id} value={b.id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                        </select>
                                    </label>
                                )}
                                {userResource && (
                                    <label className="text-sm font-medium">
                                        Loket penugasan
                                        <select
                                            className="field mt-1"
                                            required={[
                                                'officer',
                                                'teller',
                                                'cs',
                                            ].includes(form.data.role_id)}
                                            value={form.data.counter_id}
                                            onChange={(e) =>
                                                form.setData(
                                                    'counter_id',
                                                    e.target.value,
                                                )
                                            }
                                        >
                                            <option value="">
                                                Tidak ditugaskan
                                            </option>
                                            {counters
                                                .filter(
                                                    (c) =>
                                                        c.branch_id ===
                                                        form.data.branch_id,
                                                )
                                                .map((c) => (
                                                    <option
                                                        key={c.id}
                                                        value={c.id}
                                                    >
                                                        {c.name}
                                                    </option>
                                                ))}
                                        </select>
                                    </label>
                                )}
                                {resource === 'counters' && (
                                    <fieldset className="rounded-xl border p-4 sm:col-span-2">
                                        <legend className="px-1 text-sm font-medium">
                                            Layanan yang ditangani
                                        </legend>
                                        <div className="grid gap-3 sm:grid-cols-2">
                                            {services.map((s) => (
                                                <label
                                                    key={s.id}
                                                    className="flex items-center gap-2 text-sm"
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={form.data.service_ids.includes(
                                                            s.id,
                                                        )}
                                                        onChange={(e) =>
                                                            form.setData(
                                                                'service_ids',
                                                                e.target.checked
                                                                    ? [
                                                                          ...form
                                                                              .data
                                                                              .service_ids,
                                                                          s.id,
                                                                      ]
                                                                    : form.data.service_ids.filter(
                                                                          (
                                                                              id,
                                                                          ) =>
                                                                              id !==
                                                                              s.id,
                                                                      ),
                                                            )
                                                        }
                                                    />
                                                    {s.name}
                                                </label>
                                            ))}
                                        </div>
                                    </fieldset>
                                )}
                                {['services', 'counters'].includes(
                                    resource,
                                ) && (
                                    <label className="text-sm font-medium sm:col-span-2">
                                        Keterangan
                                        <textarea
                                            className="field mt-1"
                                            value={form.data.description ?? ''}
                                            onChange={(e) =>
                                                form.setData(
                                                    'description',
                                                    e.target.value,
                                                )
                                            }
                                        />
                                    </label>
                                )}
                                <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
                                    <input
                                        type="checkbox"
                                        checked={form.data.is_active}
                                        onChange={(e) =>
                                            form.setData(
                                                'is_active',
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    Aktif
                                </label>
                            </div>
                            <p className="mt-4 text-xs text-slate-500">
                                Nonaktifkan data untuk menghentikan
                                penggunaannya dan menyimpan riwayat layanan.
                            </p>
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    type="button"
                                    className="action-secondary"
                                    onClick={() => setVisible(false)}
                                >
                                    Batal
                                </button>
                                <button
                                    className="action"
                                    disabled={form.processing}
                                >
                                    {form.processing
                                        ? 'Menyimpan…'
                                        : 'Simpan data'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
