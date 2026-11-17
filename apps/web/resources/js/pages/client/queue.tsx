import { Feedback } from "@/components/queue-common";
import ClientLayout from "@/layouts/client-layout";
import { createRequestId } from "@/lib/request-id";
import {
    deposit as depositPage,
    store as storeTicket,
} from "@/routes/client/branch";
import type { Branch, Service } from "@/types/queue";
import { Head, Link, useForm, usePoll } from "@inertiajs/react";

type Props = {
    branch: Branch;
    services: Service[];
    availability: { branch_id: string; service_ids: string[] }[];
    sessions: { branch_id: string; status: string }[];
    waiting: { branch_id: string; service_id: string }[];
};
export default function Queue({
    branch,
    services,
    availability,
    sessions,
    waiting,
}: Props) {
    usePoll(5000, { only: ["sessions", "waiting", "availability"] });
    const form = useForm({
        branch_id: branch.id,
        service_id: "",
        request_id: createRequestId(),
    });
    const availableIds = availability.flatMap((a) => a.service_ids);
    const available = services.filter((s) => availableIds.includes(s.id));
    const open = sessions.some((s) => s.status === "OPEN");
    const service = available.find((s) => s.id === form.data.service_id);
    const cardClass =
        "block h-full rounded-2xl border p-5 text-left transition hover:border-blue-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary";

    return (
        <ClientLayout branchSlug={branch.slug} branchId={branch.id}>
            <Head title={`Antrean ${branch.name}`} />
            <div className="mx-auto max-w-6xl px-4 pb-12">
                <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-primary">
                            BANK WONOSOBO · {branch.name.toUpperCase()}
                        </p>
                        <h1 className="mt-2 text-3xl font-bold tracking-tight">
                            Silakan pilih layanan Anda
                        </h1>
                        {/* <p className="mt-2 text-sm text-slate-500">
                            {branch.address}
                        </p> */}
                    </div>
                    <div
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${open ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}
                    >
                        {open ? "Layanan buka" : "Sesi antrean belum dibuka"}
                    </div>
                </div>
                <Feedback />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {available.map((s) => {
                        const content = (
                            <>
                                <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-white/30  text-xl font-bold text-white">
                                    {s.prefix}
                                </span>
                                <h2 className="font-bold text-xl">{s.name}</h2>
                                <p className="mt-2 text-xs leading-5">
                                    {s.description}
                                </p>
                                <p className="mt-4 text-xs">
                                    {
                                        waiting.filter(
                                            (t) => t.service_id === s.id,
                                        ).length
                                    }{" "}
                                    menunggu
                                </p>
                                <p className="mt-3 text-sm font-semibold text-primary">
                                    {s.transaction_type
                                        ? "Isi formulir →"
                                        : "Pilih layanan →"}
                                </p>
                            </>
                        );
                        return s.transaction_type ? (
                            <Link
                                key={s.id}
                                href={depositPage.url({
                                    branch: branch.slug,
                                    service: s.id,
                                })}
                                className={`${cardClass}  bg-primary text-white shadow-lg`}
                            >
                                {content}
                            </Link>
                        ) : (
                            <button
                                key={s.id}
                                type="button"
                                disabled={form.processing}
                                aria-pressed={s.id === form.data.service_id}
                                onClick={() => {
                                    form.setData({
                                        branch_id: branch.id,
                                        service_id: s.id,
                                        request_id: createRequestId(),
                                    });
                                    form.clearErrors();
                                }}
                                className={`text-white ${cardClass} ${s.id === form.data.service_id ? "border-white bg-primary/50" : "bg-primary shadow-lg"}`}
                            >
                                {content}
                            </button>
                        );
                    })}
                </div>
                {!available.length && (
                    <p className="panel text-slate-500">
                        Belum ada layanan yang tersedia di kantor ini. Hubungi
                        petugas.
                    </p>
                )}
                {service && (
                    <form
                        className="mt-6 flex flex-col justify-between gap-5 rounded-2xl bg-slate-900 p-6 text-white sm:flex-row sm:items-center"
                        onSubmit={(e) => {
                            e.preventDefault();
                            form.post(storeTicket.url(branch.slug));
                        }}
                    >
                        <div>
                            <p className="text-sm text-slate-300">
                                {branch.name}
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                                {service.name}
                            </p>
                            <p className="mt-2 text-sm text-slate-300">
                                Layanan ini tidak memerlukan formulir. Tunggu
                                panggilan petugas setelah mengambil tiket.
                            </p>
                        </div>
                        <button
                            className="action bg-white! text-primary!"
                            disabled={form.processing || !open}
                        >
                            {form.processing
                                ? "Membuat tiket…"
                                : "Ambil nomor antrean →"}
                        </button>
                    </form>
                )}
            </div>
        </ClientLayout>
    );
}
