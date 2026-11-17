import { Head, useForm } from '@inertiajs/react';
import AdminLayout from '@/layouts/admin-layout';
type Role = { id: string; name: string; permissions: string[] };
type Props = {
    group: string;
    settings: {
        digits?: number;
        max_daily_tickets?: number;
        title?: string;
        message?: string;
        poll_seconds?: number;
        sound?: boolean;
        video_url?: string | null;
    };
    roles: Role[];
};
const labels: Record<string, string> = {
    operate: 'Operasional antrean',
    reports: 'Laporan',
    master: 'Master data',
    users: 'Manajemen pengguna',
    settings: 'Pengaturan sistem',
};
function RoleForm({ role }: { role: Role }) {
    const form = useForm({ role_id: role.id, permissions: role.permissions });
    return (
        <form
            className="panel"
            onSubmit={(e) => {
                e.preventDefault();
                form.post('/admin/settings/roles', { preserveScroll: true });
            }}
        >
            <h2 className="mb-4 text-lg font-semibold">{role.name}</h2>
            <div className="space-y-3">
                {Object.entries(labels).map(([id, title]) => (
                    <label key={id} className="flex gap-3 text-sm">
                        <input
                            type="checkbox"
                            disabled={
                                role.id === 'admin' ||
                                id === 'operate' ||
                                ['master', 'users', 'settings'].includes(id)
                            }
                            checked={
                                role.id === 'admin' ||
                                form.data.permissions.includes(id)
                            }
                            onChange={(e) =>
                                form.setData(
                                    'permissions',
                                    e.target.checked
                                        ? [...form.data.permissions, id]
                                        : form.data.permissions.filter(
                                              (v) => v !== id,
                                          ),
                                )
                            }
                        />
                        {title}
                    </label>
                ))}
            </div>
            {role.id !== 'admin' ? (
                <button className="action mt-5" disabled={form.processing}>
                    Simpan hak akses
                </button>
            ) : (
                <p className="mt-5 text-xs text-slate-500">
                    Administrator memiliki akses seluruh cabang dan konfigurasi
                    sistem.
                </p>
            )}
            <p className="mt-4 text-xs leading-5 text-slate-500">
                Petugas dan supervisor dibatasi pada cabang penugasannya.
                Konfigurasi global dikelola administrator.
            </p>
        </form>
    );
}
export default function Settings({ group, settings, roles }: Props) {
    const form = useForm({
        digits: settings.digits ?? 3,
        max_daily_tickets: settings.max_daily_tickets ?? 1000,
        title: settings.title ?? '',
        message: settings.message ?? '',
        poll_seconds: settings.poll_seconds ?? 5,
        sound: settings.sound ?? true,
        video_url: settings.video_url ?? '',
    });
    const title =
        group === 'queue'
            ? 'Konfigurasi antrean'
            : group === 'display'
              ? 'Pengaturan display'
              : 'Role & permission';
    return (
        <AdminLayout>
            <Head title={title} />
            <div className="mx-auto max-w-5xl">
                <h1 className="mb-2 text-3xl font-bold">{title}</h1>
                <p className="mb-7 text-sm text-slate-500">
                    Atur kebijakan antrean dan tampilan layanan Bank Wonosobo.
                </p>
                {group === 'roles' ? (
                    <div className="grid gap-5 md:grid-cols-3">
                        {roles.map((role) => (
                            <RoleForm key={role.id} role={role} />
                        ))}
                    </div>
                ) : (
                    <form
                        className="panel max-w-2xl space-y-5"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post('/admin/settings/' + group, {
                                preserveScroll: true,
                            });
                        }}
                    >
                        {group === 'queue' ? (
                            <>
                                <label className="block text-sm font-medium">
                                    Jumlah digit nomor
                                    <input
                                        className="field mt-2"
                                        type="number"
                                        min={3}
                                        max={6}
                                        value={form.data.digits}
                                        onChange={(e) =>
                                            form.setData(
                                                'digits',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                    <span className="mt-2 block text-xs text-slate-500">
                                        Contoh: 3 digit menghasilkan A001.
                                        Berlaku untuk tiket berikutnya.
                                    </span>
                                </label>
                                <label className="block text-sm font-medium">
                                    Kuota tiket per cabang per hari
                                    <input
                                        className="field mt-2"
                                        type="number"
                                        min={1}
                                        max={999999}
                                        value={form.data.max_daily_tickets}
                                        onChange={(e) =>
                                            form.setData(
                                                'max_daily_tickets',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </label>
                            </>
                        ) : (
                            <>
                                <label className="block text-sm font-medium">
                                    Judul display
                                    <input
                                        required
                                        className="field mt-2"
                                        value={form.data.title}
                                        onChange={(e) =>
                                            form.setData(
                                                'title',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label className="block text-sm font-medium">
                                    Pesan informasi
                                    <textarea
                                        required
                                        className="field mt-2"
                                        value={form.data.message}
                                        onChange={(e) =>
                                            form.setData(
                                                'message',
                                                e.target.value,
                                            )
                                        }
                                    />
                                </label>
                                <label className="block text-sm font-medium">
                                    URL video iklan
                                    <input
                                        className="field mt-2"
                                        type="url"
                                        maxLength={2048}
                                        placeholder="https://server-bank/videos/iklan.mp4"
                                        value={form.data.video_url}
                                        aria-invalid={!!form.errors.video_url}
                                        aria-describedby="video-url-help video-url-error"
                                        onChange={(e) =>
                                            form.setData(
                                                'video_url',
                                                e.target.value,
                                            )
                                        }
                                    />
                                    <span
                                        id="video-url-help"
                                        className="mt-2 block text-xs font-normal text-slate-500"
                                    >
                                        Gunakan tautan langsung ke file MP4 atau
                                        WebM yang dapat diakses perangkat
                                        monitor. Video diputar otomatis,
                                        berulang, dan tanpa suara secara
                                        default. Kosongkan untuk menonaktifkan
                                        video.
                                    </span>
                                    {form.errors.video_url && (
                                        <span
                                            id="video-url-error"
                                            role="alert"
                                            className="mt-2 block text-xs text-red-600"
                                        >
                                            {form.errors.video_url}
                                        </span>
                                    )}
                                </label>
                                <label className="block text-sm font-medium">
                                    Interval pembaruan (detik)
                                    <input
                                        className="field mt-2"
                                        type="number"
                                        min={3}
                                        max={60}
                                        value={form.data.poll_seconds}
                                        onChange={(e) =>
                                            form.setData(
                                                'poll_seconds',
                                                Number(e.target.value),
                                            )
                                        }
                                    />
                                </label>
                                <label className="flex gap-3 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={form.data.sound}
                                        onChange={(e) =>
                                            form.setData(
                                                'sound',
                                                e.target.checked,
                                            )
                                        }
                                    />
                                    Aktifkan fitur suara pemanggilan di monitor
                                </label>
                                <p className="text-xs text-slate-500">
                                    Operator perlu menekan Aktifkan suara pada
                                    layar monitor sesuai kebijakan browser.
                                </p>
                            </>
                        )}
                        <button className="action" disabled={form.processing}>
                            {form.processing
                                ? 'Menyimpan…'
                                : 'Simpan pengaturan'}
                        </button>
                    </form>
                )}
            </div>
        </AdminLayout>
    );
}
