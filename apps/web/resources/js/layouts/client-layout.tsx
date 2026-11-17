import { branch as branchHome } from "@/routes/client";
import { Link } from "@inertiajs/react";
import type { ReactNode } from "react";
export default function ClientLayout({
    children,
    branchSlug,
    branchId,
}: {
    children: ReactNode;
    branchSlug?: string;
    branchId?: string;
}) {
    const home = branchSlug ? branchHome.url(branchSlug) : "/client";
    return (
        <div className="min-h-screen bg-slate-50 text-slate-900">
            <header className="no-print border-t-4 border-red-600 bg-primary text-white shadow-sm">
                <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
                    <Link href={home} className="flex items-center gap-3">
                        <span className="flex size-11 items-center justify-center rounded-xl bg-primary font-bold text-white">
                            BW
                        </span>
                        <span>
                            <strong className="block">Bank Wonosobo</strong>
                            <span className="text-xs text-slate-500">
                                Melayani dengan sepenuh hati
                            </span>
                        </span>
                    </Link>
                    <nav className="flex gap-4 text-sm font-medium text-primary">
                        <Link href={branchSlug ? home : "/client/antrian"}>
                            Ambil antrean
                        </Link>
                        <Link
                            href={
                                branchId
                                    ? `/display?branch_id=${branchId}`
                                    : "/display"
                            }
                        >
                            Monitor
                        </Link>
                        <Link href="/admin" className="hidden sm:block">
                            Petugas
                        </Link>
                    </nav>
                </div>
            </header>
            <main className="pt-8">{children}</main>
        </div>
    );
}
