import { AppSidebar } from '@/components/app-sidebar';
import {
    SidebarInset,
    SidebarProvider,
    SidebarTrigger,
} from '@/components/ui/sidebar';
import { Feedback } from '@/components/queue-common';
import { Link, usePage } from '@inertiajs/react';
import type { ReactNode } from 'react';
export default function AdminLayout({ children }: { children: ReactNode }) {
    const { auth } = usePage().props;
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset>
                <header className="flex min-h-16 flex-wrap items-center justify-between gap-3 border-b bg-white px-5 py-3">
                    <div className="flex items-center gap-3">
                        <SidebarTrigger />
                        <span className="text-sm text-slate-500">
                            BW TAB{' '}
                            <span className="mx-2 text-slate-300">/</span>{' '}
                            Administrasi
                        </span>
                    </div>
                    <div className="flex items-center gap-5">
                        <Link
                            href="/display"
                            className="text-xs font-semibold text-primary"
                        >
                            Display ↗
                        </Link>
                        <Link
                            href="/client/antrian"
                            className="text-xs font-semibold text-primary"
                        >
                            Client ↗
                        </Link>
                        <span className="hidden text-sm font-medium sm:block">
                            {auth.user?.name}
                        </span>
                    </div>
                </header>
                <main className="min-h-[calc(100vh-4rem)] bg-slate-50 p-4 sm:p-7">
                    <Feedback />
                    {children}
                </main>
            </SidebarInset>
        </SidebarProvider>
    );
}
