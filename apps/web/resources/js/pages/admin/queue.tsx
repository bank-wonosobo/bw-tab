import { Pagination, Status } from '@/components/queue-common';
import { CashDepositDetails } from '@/components/cash-deposit-details';
import AdminLayout from '@/layouts/admin-layout';
import {
    statuses,
    time,
    type Branch,
    type Counter,
    type Service,
    type Ticket,
} from '@/types/queue';
import { Head, Link, router, usePage, usePoll } from '@inertiajs/react';
import { useState } from 'react';
type Props = {
    productivity: {
        counters: { name: string; total: number; minutes: number }[];
        officers: { name: string; total: number; minutes: number }[];
    };
    mode: string;
    branch: Branch;
    branches: Branch[];
    services: Service[];
    counters: Counter[];
    counterId: string;
    current: Ticket | null;
    session: { status: string } | null;
    filters: {
        date_from: string;
        date_to: string;
        search: string;
        status: string;
        service_id: string;
    };
    stats: {
        total: number;
        waiting: number;
        serving: number;
        completed: number;
        avg_service: number;
        avg_wait: number;
    };
    tickets: {
        data: Ticket[];
        total: number;
        links: { url: string | null; label: string; active: boolean }[];
    };
    report: {
        name: string;
        total: number;
        completed: number;
        waiting: number;
        avg_service: number;
    }[];
};
const titles: Record<string, string> = {
    dashboard: 'Dashboard operasional',
    monitor: 'Monitor antrean',
    tickets: 'Daftar tiket antrean',
    calls: 'Pemanggilan antrean',
    statistics: 'Statistik antrean',
    'service-time': 'Waktu pelayanan',
    history: 'Riwayat antrean',
};
export default function AdminQueue(p: Props) {
    const {
        url,
        props: { auth },
    } = usePage();
    const [busy, setBusy] = useState(false);
    const [detail, setDetail] = useState<Ticket | null>(null);
    const [filters, setFilters] = useState(p.filters);
    const operational = ['dashboard', 'calls', 'monitor'].includes(p.mode);
    usePoll(
        5000,
        { only: ['tickets', 'stats', 'current', 'session', 'report'] },
        { autoStart: operational },
    );
    function visit(extra: Record<string, string> = {}) {
        router.get(
            url.split('?')[0],
            {
                ...filters,
                branch_id: p.branch.id,
                counter_id: p.counterId,
                ...extra,
            },
            { preserveScroll: true },
        );
    }
    function action(action: string, ticketId?: string) {
        setBusy(true);
        router.post(
            '/admin/queue/action',
            {
                branch_id: p.branch.id,
                counter_id: p.counterId,
                ticket_id: ticketId ?? p.current?.id,
                action,
            },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    }
    function session(action: string) {
        setBusy(true);
        router.post(
            '/admin/queue/session',
            { branch_id: p.branch.id, action },
            { preserveScroll: true, onFinish: () => setBusy(false) },
        );
    }
    const active = p.session?.status === 'OPEN';
    const isDashboard = p.mode === 'dashboard';
    const isMonitor = p.mode === 'monitor';
    const isCalls = p.mode === 'calls';
    const isReport = ['statistics', 'service-time', 'history'].includes(p.mode);
    return (
        <AdminLayout>
            <Head title={titles[p.mode]} />
            <div className="mx-auto max-w-[1500px]">
                <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                        <p className="text-xs font-semibold tracking-widest text-primary uppercase">
                            {new Intl.DateTimeFormat('id-ID', {
                                dateStyle: 'full',
                                timeZone: 'Asia/Jakarta',
                            }).format(new Date())}
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">
                            {titles[p.mode]}
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Data antrean dan pelayanan · {p.branch.name}
                        </p>
                    </div>
                    <label className="text-xs font-semibold text-slate-500">
                        Cabang
                        <select
                            className="field mt-1"
                            value={p.branch.id}
                            onChange={(e) =>
                                visit({
                                    branch_id: e.target.value,
                                    counter_id: '',
                                })
                            }
                        >
                            {p.branches.map((b) => (
                                <option key={b.id} value={b.id}>
                                    {b.name}
                                </option>
                            ))}
                        </select>
                    </label>
                </div>
                <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                    {[
                        ['Total tiket', p.stats.total],
                        ['Menunggu', p.stats.waiting],
                        ['Dilayani / dipanggil', p.stats.serving],
                        ['Selesai', p.stats.completed],
                        ['Rata-rata tunggu', `${p.stats.avg_wait} mnt`],
                        ['Rata-rata layanan', `${p.stats.avg_service} mnt`],
                    ].map(([title, value]) => (
                        <div className="panel" key={title}>
                            <p className="text-xs text-slate-500">{title}</p>
                            <p className="mt-3 text-2xl font-bold text-slate-900">
                                {value}
                            </p>
                        </div>
                    ))}
                </div>
                {isCalls && (
                    <div className="mb-6 grid gap-5 lg:grid-cols-[1.15fr_1fr]">
                        <section className="panel">
                            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                <h2 className="font-semibold">
                                    Sesi operasional hari ini
                                </h2>
                                <span
                                    className={`rounded-full px-3 py-1 text-xs font-semibold ${active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                                >
                                    {active ? 'Sesi buka' : 'Sesi tutup'}
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    className="action"
                                    disabled={busy || active}
                                    onClick={() => session('open')}
                                >
                                    Buka sesi
                                </button>
                                <button
                                    className="action-secondary"
                                    disabled={busy || !active}
                                    onClick={() => session('close')}
                                >
                                    Tutup sesi
                                </button>
                                <Link
                                    href={`/display?branch_id=${p.branch.id}`}
                                    className="action-secondary"
                                >
                                    Buka display ↗
                                </Link>
                            </div>
                            <p className="mt-4 text-xs leading-5 text-slate-500">
                                Nomor direset berdasarkan sesi harian per
                                cabang. Tutup sesi setelah semua antrean aktif
                                selesai atau dibatalkan.
                            </p>
                            <label className="mt-5 block text-sm font-medium">
                                Loket pelayanan
                                <select
                                    className="field mt-2"
                                    value={p.counterId ?? ''}
                                    onChange={(e) =>
                                        visit({ counter_id: e.target.value })
                                    }
                                    disabled={[
                                        'officer',
                                        'teller',
                                        'cs',
                                    ].includes(auth.user?.role_id ?? '')}
                                >
                                    <option value="">Pilih loket</option>
                                    {p.counters.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name}
                                            {c.is_active
                                                ? ''
                                                : ' (nonaktif)'} ·{' '}
                                            {c.services
                                                .map((s) => s.name)
                                                .join(', ')}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </section>
                        <section className="rounded-2xl bg-primary p-6 text-white">
                            <p className="text-sm text-blue-100">
                                {p.current
                                    ? 'Tiket aktif di loket ini'
                                    : 'Siap melayani nasabah berikutnya'}
                            </p>
                            <p className="my-4 text-6xl font-bold">
                                {p.current?.ticket_code ?? '—'}
                            </p>
                            <p className="mb-5 text-sm text-blue-100">
                                {p.current
                                    ? `${p.current.service.name} · ${statuses[p.current.status]}`
                                    : 'Pilih loket dan panggil antrean berikutnya.'}
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {!p.current && (
                                    <button
                                        className="action bg-white! text-primary!"
                                        disabled={
                                            busy || !active || !p.counterId
                                        }
                                        onClick={() => action('next')}
                                    >
                                        Panggil berikutnya →
                                    </button>
                                )}
                                {p.current?.status === 'CALLED' && (
                                    <>
                                        <button
                                            className="action bg-white! text-primary!"
                                            disabled={busy}
                                            onClick={() => action('start')}
                                        >
                                            Mulai pelayanan
                                        </button>
                                        <button
                                            className="action border border-white/30 bg-white/10!"
                                            disabled={busy}
                                            onClick={() => action('recall')}
                                        >
                                            Panggil ulang
                                        </button>
                                        <button
                                            className="action border border-white/30 bg-white/10!"
                                            disabled={busy}
                                            onClick={() => action('skip')}
                                        >
                                            Lewati
                                        </button>
                                        <button
                                            className="action border border-white/30 bg-white/10!"
                                            disabled={busy}
                                            onClick={() => action('no-show')}
                                        >
                                            Tidak hadir
                                        </button>
                                    </>
                                )}
                                {p.current?.status === 'SERVING' && (
                                    <button
                                        className="action bg-white! text-primary!"
                                        disabled={busy}
                                        onClick={() => action('complete')}
                                    >
                                        Selesaikan pelayanan ✓
                                    </button>
                                )}
                            </div>
                        </section>
                    </div>
                )}
                {isDashboard && (
                    <section className="mb-6 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
                        <div className="panel">
                            <div className="mb-4 flex items-center justify-between">
                                <div>
                                    <h2 className="font-semibold">
                                        Ringkasan operasional hari ini
                                    </h2>
                                    <p className="mt-1 text-xs text-slate-500">
                                        Pantau beban layanan dan arahkan petugas
                                        ke menu yang diperlukan.
                                    </p>
                                </div>
                                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-primary">
                                    {active ? 'Sesi aktif' : 'Sesi tutup'}
                                </span>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2">
                                {p.report.slice(0, 4).map((row) => (
                                    <div
                                        key={row.name}
                                        className="rounded-xl border border-slate-100 p-4"
                                    >
                                        <p className="text-sm font-semibold">
                                            {row.name}
                                        </p>
                                        <p className="mt-2 text-2xl font-bold text-primary">
                                            {row.total}
                                        </p>
                                        <p className="text-xs text-slate-500">
                                            {row.completed} selesai ·{' '}
                                            {row.waiting} menunggu
                                        </p>
                                    </div>
                                ))}
                            </div>
                            {!p.report.length && (
                                <p className="text-sm text-slate-500">
                                    Belum ada transaksi pada sesi ini.
                                </p>
                            )}
                        </div>
                        <div className="panel">
                            <h2 className="font-semibold">Akses cepat</h2>
                            <div className="mt-4 grid gap-2">
                                <Link
                                    href="/admin/queue/monitor"
                                    className="action-secondary justify-between"
                                >
                                    Monitor antrean <span>→</span>
                                </Link>
                                <Link
                                    href="/admin/queue/calls"
                                    className="action-secondary justify-between"
                                >
                                    Pemanggilan antrean <span>→</span>
                                </Link>
                                {auth.permissions.includes('reports') && (
                                    <Link
                                        href="/admin/reports/history"
                                        className="action-secondary justify-between"
                                    >
                                        Buka laporan <span>→</span>
                                    </Link>
                                )}
                            </div>
                        </div>
                    </section>
                )}
                {isMonitor && (
                    <section className="panel mb-6">
                        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div>
                                <h2 className="font-semibold">
                                    Monitor antrean langsung
                                </h2>
                                <p className="mt-1 text-xs text-slate-500">
                                    Data diperbarui otomatis setiap 5 detik.
                                </p>
                            </div>
                            <Link
                                href={`/display?branch_id=${p.branch.id}`}
                                className="action-secondary"
                            >
                                Buka display publik ↗
                            </Link>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="rounded-xl bg-amber-50 p-4">
                                <p className="text-xs text-amber-700">
                                    Menunggu
                                </p>
                                <p className="mt-2 text-3xl font-bold text-amber-900">
                                    {p.stats.waiting}
                                </p>
                            </div>
                            <div className="rounded-xl bg-blue-50 p-4">
                                <p className="text-xs text-blue-700">
                                    Sedang dilayani
                                </p>
                                <p className="mt-2 text-3xl font-bold text-blue-900">
                                    {p.stats.serving}
                                </p>
                            </div>
                            <div className="rounded-xl bg-emerald-50 p-4">
                                <p className="text-xs text-emerald-700">
                                    Selesai
                                </p>
                                <p className="mt-2 text-3xl font-bold text-emerald-900">
                                    {p.stats.completed}
                                </p>
                            </div>
                        </div>
                        <div className="mt-5 grid gap-5 lg:grid-cols-2">
                            <div>
                                <h3 className="mb-3 text-sm font-semibold">
                                    Tiket aktif
                                </h3>
                                {p.current ? (
                                    <div className="rounded-xl bg-primary p-5 text-white">
                                        <p className="text-4xl font-bold">
                                            {p.current.ticket_code}
                                        </p>
                                        <p className="mt-2 text-sm text-blue-100">
                                            {p.current.service.name} ·{' '}
                                            {statuses[p.current.status]}
                                        </p>
                                    </div>
                                ) : (
                                    <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-500">
                                        Tidak ada tiket yang sedang dilayani.
                                    </p>
                                )}
                            </div>
                            <div>
                                <h3 className="mb-3 text-sm font-semibold">
                                    Antrean menunggu terbaru
                                </h3>
                                <div className="divide-y rounded-xl border border-slate-100">
                                    {p.tickets.data
                                        .filter(
                                            (ticket) =>
                                                ticket.status === 'WAITING',
                                        )
                                        .slice(0, 5)
                                        .map((ticket) => (
                                            <div
                                                key={ticket.id}
                                                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
                                            >
                                                <span className="font-bold text-primary">
                                                    {ticket.ticket_code}
                                                </span>
                                                <span className="text-right text-slate-500">
                                                    {ticket.service.name}
                                                    <br />
                                                    {time(ticket.issued_at)}
                                                </span>
                                            </div>
                                        ))}
                                    {!p.tickets.data.some(
                                        (ticket) => ticket.status === 'WAITING',
                                    ) && (
                                        <p className="p-4 text-sm text-slate-500">
                                            Tidak ada antrean menunggu.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </section>
                )}
                {p.current?.cash_deposit && (
                    <CashDepositDetails
                        deposit={p.current.cash_deposit}
                        branchId={p.branch.id}
                        ticketId={p.current.id}
                    />
                )}
                {(isCalls || isReport) && (
                    <form
                        className="panel mb-5 grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-6"
                        onSubmit={(e) => {
                            e.preventDefault();
                            visit();
                        }}
                    >
                        <label className="text-xs font-medium">
                            Dari tanggal
                            <input
                                className="field mt-1"
                                type="date"
                                value={filters.date_from}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        date_from: e.target.value,
                                        date_to:
                                            e.target.value > filters.date_to
                                                ? e.target.value
                                                : filters.date_to,
                                    })
                                }
                            />
                        </label>
                        <label className="text-xs font-medium">
                            Sampai tanggal
                            <input
                                className="field mt-1"
                                type="date"
                                min={filters.date_from}
                                value={filters.date_to}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        date_to: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <label className="text-xs font-medium">
                            Layanan
                            <select
                                className="field mt-1"
                                value={filters.service_id}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        service_id: e.target.value,
                                    })
                                }
                            >
                                <option value="">Semua layanan</option>
                                {p.services.map((s) => (
                                    <option value={s.id} key={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs font-medium">
                            Status
                            <select
                                className="field mt-1"
                                value={filters.status}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        status: e.target.value,
                                    })
                                }
                            >
                                <option value="">Semua status</option>
                                {Object.entries(statuses).map(([id, label]) => (
                                    <option key={id} value={id}>
                                        {label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="text-xs font-medium">
                            Cari nomor
                            <input
                                className="field mt-1"
                                placeholder="A001"
                                value={filters.search}
                                onChange={(e) =>
                                    setFilters({
                                        ...filters,
                                        search: e.target.value,
                                    })
                                }
                            />
                        </label>
                        <button className="action">Terapkan filter</button>
                    </form>
                )}
                {auth.permissions.includes('reports') && isReport && (
                    <div className="mb-5 flex flex-wrap justify-end gap-3">
                        <a
                            className="action-secondary"
                            href={`/admin/reports/history?${new URLSearchParams({ ...p.filters, branch_id: p.branch.id, export: '1' })}`}
                        >
                            Unduh laporan CSV
                        </a>
                    </div>
                )}
                {['statistics', 'service-time'].includes(p.mode) && (
                    <section className="panel mb-5">
                        <h2 className="mb-4 font-semibold">
                            Ringkasan per layanan
                        </h2>
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                            {p.report.map((r) => (
                                <div
                                    key={r.name}
                                    className="rounded-xl bg-slate-50 p-4"
                                >
                                    <h3 className="font-medium">{r.name}</h3>
                                    <p className="mt-2 text-2xl font-bold text-primary">
                                        {r.total}{' '}
                                        <span className="text-xs font-normal text-slate-500">
                                            tiket
                                        </span>
                                    </p>
                                    <p className="mt-2 text-xs leading-6 text-slate-500">
                                        {r.completed} selesai · {r.waiting}{' '}
                                        menunggu
                                        <br />
                                        Rata-rata layanan {r.avg_service} menit
                                    </p>
                                </div>
                            ))}
                        </div>
                        {!p.report.length && (
                            <p className="text-sm text-slate-500">
                                Belum ada data pada periode ini.
                            </p>
                        )}
                    </section>
                )}
                {['statistics', 'service-time'].includes(p.mode) && (
                    <div className="mb-5 grid gap-5 lg:grid-cols-2">
                        {(['counters', 'officers'] as const).map((group) => (
                            <section className="panel" key={group}>
                                <h2 className="mb-4 font-semibold">
                                    Produktivitas{' '}
                                    {group === 'counters' ? 'loket' : 'petugas'}
                                </h2>
                                {p.productivity[group].map((row) => (
                                    <div
                                        key={row.name}
                                        className="flex items-center justify-between gap-3 border-b border-slate-100 py-3 text-sm"
                                    >
                                        <span className="font-medium">
                                            {row.name}
                                        </span>
                                        <span className="text-right text-slate-500">
                                            {row.total} tiket selesai
                                            <br />
                                            Rata-rata {row.minutes} menit
                                        </span>
                                    </div>
                                ))}
                                {!p.productivity[group].length && (
                                    <p className="text-sm text-slate-500">
                                        Belum ada pelayanan selesai pada periode
                                        ini.
                                    </p>
                                )}
                            </section>
                        ))}
                    </div>
                )}
                {['dashboard', 'calls', 'history'].includes(p.mode) && (
                    <section className="panel overflow-hidden">
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="font-semibold">
                                Daftar antrean{' '}
                                <span className="ml-2 text-sm font-normal text-slate-400">
                                    {p.tickets.total} tiket
                                </span>
                            </h2>
                            <button
                                className="text-sm font-semibold text-primary"
                                onClick={() => router.reload()}
                            >
                                Segarkan
                            </button>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="border-b bg-slate-50 text-xs text-slate-500">
                                    <tr>
                                        {[
                                            'Nomor',
                                            'Layanan',
                                            'Loket',
                                            'Diambil',
                                            'Status',
                                            'Tindakan',
                                        ].map((t) => (
                                            <th
                                                key={t}
                                                className="p-3 whitespace-nowrap"
                                            >
                                                {t}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {p.tickets.data.map((t) => (
                                        <tr key={t.id}>
                                            <td className="p-3 font-bold text-primary">
                                                {t.ticket_code}
                                            </td>
                                            <td className="p-3">
                                                {t.service.name}
                                            </td>
                                            <td className="p-3">
                                                {t.counter?.name ?? '—'}
                                            </td>
                                            <td className="p-3 text-xs whitespace-nowrap text-slate-500">
                                                {time(t.issued_at)}
                                            </td>
                                            <td className="p-3">
                                                <Status status={t.status} />
                                            </td>
                                            <td className="p-3">
                                                <div className="flex gap-3 whitespace-nowrap">
                                                    <button
                                                        className="font-medium text-primary"
                                                        onClick={() =>
                                                            setDetail(t)
                                                        }
                                                    >
                                                        Detail
                                                    </button>
                                                    {[
                                                        'SKIPPED',
                                                        'NO_SHOW',
                                                    ].includes(t.status) && (
                                                        <button
                                                            disabled={busy}
                                                            className="text-primary"
                                                            onClick={() =>
                                                                action(
                                                                    'requeue',
                                                                    t.id,
                                                                )
                                                            }
                                                        >
                                                            Antrekan ulang
                                                        </button>
                                                    )}
                                                    {[
                                                        'WAITING',
                                                        'CALLED',
                                                    ].includes(t.status) && (
                                                        <button
                                                            disabled={busy}
                                                            className="text-red-600"
                                                            onClick={() => {
                                                                if (
                                                                    window.confirm(
                                                                        `Batalkan tiket ${t.ticket_code}?`,
                                                                    )
                                                                )
                                                                    action(
                                                                        'cancel',
                                                                        t.id,
                                                                    );
                                                            }}
                                                        >
                                                            Batalkan
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {!p.tickets.data.length && (
                                <p className="py-12 text-center text-sm text-slate-400">
                                    Tidak ada tiket yang sesuai filter.
                                </p>
                            )}
                        </div>
                        <Pagination links={p.tickets.links} />
                    </section>
                )}
                {detail && (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Detail tiket"
                        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/40 p-4"
                        onClick={() => setDetail(null)}
                    >
                        <div
                            className="panel max-h-[85vh] w-full max-w-2xl overflow-auto"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="mb-5 flex items-center justify-between">
                                <h2 className="text-xl font-bold">
                                    Tiket {detail.ticket_code}
                                </h2>
                                <button
                                    className="action-secondary"
                                    onClick={() => setDetail(null)}
                                >
                                    Tutup ×
                                </button>
                            </div>
                            <Status status={detail.status} />
                            {detail.cash_deposit && (
                                <CashDepositDetails
                                    deposit={detail.cash_deposit}
                                    branchId={p.branch.id}
                                    ticketId={detail.id}
                                />
                            )}
                            <dl className="my-5 grid grid-cols-2 gap-3 text-sm">
                                {[
                                    ['Diambil', detail.issued_at],
                                    ['Dipanggil', detail.called_at],
                                    ['Mulai layanan', detail.started_at],
                                    ['Selesai', detail.completed_at],
                                ].map(([label, value]) => (
                                    <div key={label}>
                                        <dt className="text-xs text-slate-500">
                                            {label}
                                        </dt>
                                        <dd className="mt-1">{time(value)}</dd>
                                    </div>
                                ))}
                            </dl>
                            <h3 className="mb-3 font-semibold">
                                Riwayat pemanggilan
                            </h3>
                            {detail.calls.map((c) => (
                                <p
                                    className="mb-2 text-sm text-slate-600"
                                    key={c.id}
                                >
                                    #{c.call_number} · {c.counter.name} ·{' '}
                                    {time(c.called_at)} · {c.response_status}
                                </p>
                            ))}
                            <h3 className="mt-6 mb-3 font-semibold">
                                Audit aktivitas
                            </h3>
                            {detail.events.map((e) => (
                                <div
                                    key={e.id}
                                    className="mb-3 border-l-2 border-blue-200 pl-3"
                                >
                                    <p className="text-sm font-medium">
                                        {e.event_type}
                                    </p>
                                    <p className="text-xs text-slate-500">
                                        {time(e.created_at)} ·{' '}
                                        {e.actor?.name ?? 'Nasabah / sistem'} ·{' '}
                                        {e.previous_status ?? 'Baru'} →{' '}
                                        {e.new_status}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
