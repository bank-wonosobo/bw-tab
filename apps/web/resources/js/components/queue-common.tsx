import { Link, usePage } from '@inertiajs/react';
import { statuses } from '@/types/queue';

export function Feedback() {
    const { errors, notice } = usePage().props;
    return (
        <div aria-live="polite">
            {notice ? (
                <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                    {String(notice)}
                </p>
            ) : null}
            {Object.keys(errors ?? {}).length > 0 && (
                <div
                    role="alert"
                    className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                >
                    {Object.entries(errors).map(([key, value]) => (
                        <p key={key}>{String(value)}</p>
                    ))}
                </div>
            )}
        </div>
    );
}
export function Status({ status }: { status: string }) {
    return (
        <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap ${status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' : status === 'WAITING' ? 'bg-amber-100 text-amber-800' : ['CALLED', 'SERVING'].includes(status) ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'}`}
        >
            {statuses[status] ?? status}
        </span>
    );
}
export function Pagination({
    links,
}: {
    links: { url: string | null; label: string; active: boolean }[];
}) {
    return (
        <nav aria-label="Halaman data" className="mt-4 flex flex-wrap gap-2">
            {links.map((link, i) =>
                link.url ? (
                    <Link
                        key={i}
                        href={link.url}
                        preserveScroll
                        className={`rounded-lg border px-3 py-2 text-sm ${link.active ? 'bg-primary text-white' : 'bg-white'}`}
                    >
                        {link.label
                            .replace(/&laquo;/g, '«')
                            .replace(/&raquo;/g, '»')}
                    </Link>
                ) : (
                    <span key={i} className="px-3 py-2 text-sm text-slate-400">
                        {link.label
                            .replace(/&laquo;/g, '«')
                            .replace(/&raquo;/g, '»')}
                    </span>
                ),
            )}
        </nav>
    );
}
