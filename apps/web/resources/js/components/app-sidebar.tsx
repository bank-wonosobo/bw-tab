import type { ComponentProps } from 'react';
import { Link, usePage } from '@inertiajs/react';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
} from '@/components/ui/sidebar';

const groups = [
    {
        title: 'Ringkasan',
        permission: 'operate',
        links: [['Dashboard', '/admin']],
    },
    {
        title: 'Operasional',
        permission: 'operate',
        links: [
            ['Monitor antrean', '/admin/queue/monitor'],
            ['Daftar tiket', '/admin/queue/tickets'],
            ['Pemanggilan antrean', '/admin/queue/calls'],
        ],
    },
    {
        title: 'Master data',
        permission: 'master',
        links: [
            ['Kantor / cabang', '/admin/master/branches'],
            ['Layanan', '/admin/master/services'],
            ['Loket pelayanan', '/admin/master/counters'],
        ],
    },
    {
        title: 'Petugas',
        permission: 'users',
        links: [['Petugas & pengguna', '/admin/master/users']],
    },
    {
        title: 'Laporan',
        permission: 'reports',
        links: [
            ['Statistik antrean', '/admin/reports/statistics'],
            ['Waktu pelayanan', '/admin/reports/service-time'],
            ['Riwayat antrean', '/admin/reports/history'],
        ],
    },
    {
        title: 'Pengaturan',
        permission: 'settings',
        links: [
            ['Role & permission', '/admin/settings/roles'],
            ['Konfigurasi antrean', '/admin/settings/queue'],
            ['Pengaturan display', '/admin/settings/display'],
        ],
    },
];
export function AppSidebar(props: ComponentProps<typeof Sidebar>) {
    const {
        url,
        props: { auth },
    } = usePage();
    return (
        <Sidebar variant="inset" {...props}>
            <SidebarHeader className="border-b p-5">
                <Link href="/admin" className="flex items-center gap-3">
                    <span className="flex size-10 items-center justify-center rounded-xl bg-primary font-bold text-white">
                        BW
                    </span>
                    <span>
                        <strong className="block text-sm">Bank Wonosobo</strong>
                        <span className="text-xs text-slate-500">
                            Manajemen antrean
                        </span>
                    </span>
                </Link>
            </SidebarHeader>
            <SidebarContent className="gap-0 p-3">
                {groups
                    .filter((g) => auth.permissions.includes(g.permission))
                    .map((group) => (
                        <section key={group.title} className="mb-3">
                            <p className="px-3 pt-3 pb-2 text-[11px] font-semibold tracking-widest text-slate-400 uppercase">
                                {group.title}
                            </p>
                            {group.links.map(([title, href]) => (
                                <Link
                                    key={href}
                                    href={href}
                                    className={`mb-1 block rounded-xl px-3 py-2.5 text-sm transition ${url.split('?')[0] === href ? 'bg-blue-100 font-semibold text-primary' : 'text-slate-600 hover:bg-slate-100'}`}
                                >
                                    {title}
                                </Link>
                            ))}
                        </section>
                    ))}
            </SidebarContent>
            <SidebarFooter className="border-t p-4">
                <p className="truncate text-sm font-semibold">
                    {auth.user?.name}
                </p>
                <p className="truncate text-xs text-slate-500">
                    {auth.user?.email}
                </p>
                <Link
                    href="/logout"
                    as="button"
                    method="post"
                    className="mt-3 text-left text-sm font-semibold text-red-600"
                >
                    Keluar dari akun
                </Link>
            </SidebarFooter>
        </Sidebar>
    );
}
