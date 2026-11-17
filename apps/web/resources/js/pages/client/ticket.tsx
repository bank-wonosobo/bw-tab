import { Head, Link, usePoll } from '@inertiajs/react';
import { useState } from 'react';
import ClientLayout from '@/layouts/client-layout';
import { Status } from '@/components/queue-common';
import { printQueueTicket } from '@/lib/queue-ticket-print';
import { time, type Ticket } from '@/types/queue';
import { branch as branchHome } from '@/routes/client';
export default function TicketPage({
    ticket,
    ahead,
}: {
    ticket: Ticket;
    ahead: number;
}) {
    const [printFeedback, setPrintFeedback] = useState<{
        error: boolean;
        message: string;
    } | null>(null);
    usePoll(5000, { only: ['ticket', 'ahead'] });

    function handlePrint() {
        try {
            printQueueTicket({
                ticketCode: ticket.ticket_code,
                serviceName: ticket.service.name,
                branchName: ticket.session.branch.name,
                issuedAt: ticket.issued_at,
            });
            setPrintFeedback({
                error: false,
                message: 'Permintaan cetak dikirim ke RawBT.',
            });
        } catch (error) {
            setPrintFeedback({
                error: true,
                message:
                    error instanceof Error
                        ? error.message
                        : 'RawBT tidak dapat dibuka. Periksa aplikasi RawBT dan koneksi printer, lalu coba lagi.',
            });
        }
    }

    return (
        <ClientLayout
            branchSlug={ticket.session.branch.slug}
            branchId={ticket.session.branch.id}
        >
            <Head title={`Tiket ${ticket.ticket_code}`} />
            <div className="mx-auto max-w-lg px-5 pb-12">
                <article className="print-ticket panel overflow-hidden p-0! text-center">
                    <div className="bg-primary px-6 py-9 text-white print:bg-white print:text-black">
                        <p className="text-sm">BANK WONOSOBO</p>
                        <h1 className="my-5 text-7xl font-bold tracking-tight">
                            {ticket.ticket_code}
                        </h1>
                        <p className="text-sm">Nomor antrean Anda</p>
                    </div>
                    <div className="space-y-5 p-7">
                        <Status status={ticket.status} />
                        <div>
                            <h2 className="text-xl font-bold">
                                {ticket.service.name}
                            </h2>
                            <p className="mt-1 text-slate-500">
                                {ticket.session.branch.name}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                                {time(ticket.issued_at)}
                            </p>
                        </div>
                        {['CALLED', 'SERVING'].includes(ticket.status) ? (
                            <p
                                role="status"
                                className="rounded-xl bg-blue-50 p-4 font-semibold text-primary"
                            >
                                Silakan menuju{' '}
                                {ticket.counter?.name ?? 'loket pelayanan'}
                            </p>
                        ) : ticket.status === 'WAITING' ? (
                            <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                                {ahead} nasabah di depan Anda · estimasi ±{' '}
                                {ahead * ticket.service.estimated_duration}{' '}
                                menit
                            </p>
                        ) : (
                            <p className="text-sm text-slate-500">
                                Terima kasih telah menggunakan layanan Bank
                                Wonosobo.
                            </p>
                        )}
                        <p className="text-xs leading-5 text-slate-400">
                            Status diperbarui otomatis. Simpan halaman ini di
                            browser yang sama dan pantau monitor cabang.
                        </p>
                    </div>
                </article>
                <div className="no-print mt-5 grid gap-3 sm:grid-cols-2">
                    <button
                        type="button"
                        className="action"
                        onClick={handlePrint}
                    >
                        Cetak tiket
                    </button>
                    <Link
                        className="action-secondary"
                        href={branchHome.url(ticket.session.branch.slug)}
                    >
                        Ambil antrean lain
                    </Link>
                </div>
                {printFeedback && (
                    <p
                        role={printFeedback.error ? 'alert' : 'status'}
                        className={`no-print mt-3 text-center text-sm ${printFeedback.error ? 'text-red-600' : 'text-slate-600'}`}
                    >
                        {printFeedback.message}
                    </p>
                )}
            </div>
        </ClientLayout>
    );
}
