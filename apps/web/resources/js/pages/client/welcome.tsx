import { Head, Link } from '@inertiajs/react';
import ClientLayout from '@/layouts/client-layout';
export default function Welcome() {
    return (
        <ClientLayout>
            <Head title="Selamat datang" />
            <div className="mx-auto max-w-6xl px-5 pb-12">
                <section className="rounded-3xl bg-primary px-7 py-12 text-white sm:px-12">
                    <p className="text-xs font-bold tracking-widest text-blue-100">
                        BANK WONOSOBO · ANTREAN DIGITAL
                    </p>
                    <h1 className="mt-4 max-w-xl text-4xl leading-tight font-bold">
                        Layanan perbankan,
                        <br />
                        lebih nyaman.
                    </h1>
                    <p className="mt-5 max-w-lg leading-7 text-blue-100">
                        Ambil nomor antrean untuk kebutuhan perbankan Anda.
                    </p>
                    <Link
                        className="mt-7 inline-flex rounded-xl bg-white px-6 py-3 font-semibold text-primary"
                        href="/client/antrian"
                    >
                        Ambil nomor antrean →
                    </Link>
                </section>
                <h2 className="mt-9 mb-5 text-2xl font-bold">
                    Apa yang Anda butuhkan?
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    {[
                        [
                            'A',
                            'Setor Tabungan',
                            'Cek rekening dan isi nominal setoran.',
                        ],
                        [
                            'D',
                            'Setor Deposito',
                            'Cek rekening deposito dan isi setoran.',
                        ],
                        [
                            'C',
                            'Setor Pinjaman',
                            'Cek rekening pinjaman dan isi pembayaran.',
                        ],
                        [
                            'E',
                            'Tarik Tunai',
                            'Langsung ambil nomor antrean teller.',
                        ],
                        [
                            'B',
                            'Customer Service',
                            'Langsung ambil nomor antrean CS.',
                        ],
                    ].map(([code, title, desc]) => (
                        <Link
                            href="/client/antrian"
                            key={title}
                            className="panel transition hover:-translate-y-1 hover:border-blue-300"
                        >
                            <span className="flex size-12 items-center justify-center rounded-xl bg-blue-50 text-xl font-bold text-primary">
                                {code}
                            </span>
                            <h3 className="mt-5 text-lg font-bold">{title}</h3>
                            <p className="mt-2 text-sm text-slate-500">
                                {desc}
                            </p>
                            <p className="mt-5 text-sm font-medium text-primary">
                                Pilih cabang & layanan →
                            </p>
                        </Link>
                    ))}
                </div>
            </div>
        </ClientLayout>
    );
}
