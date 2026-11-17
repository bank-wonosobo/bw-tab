"use client";

import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    BankIcon,
    CheckmarkCircle01Icon,
    InformationCircleIcon,
    MoneyReceiveSquareIcon,
    UserCircleIcon,
    Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface SetoranTabunganPayload {
    kodeCabang: string;
    noTab: string;
    setor: string;
    tarik: string;
    keterangan: string;
    sumberDana: string;
    tujuanTransaksi: string;
}

interface SetoranTabunganPageProps {
    kodeCabang?: string;
    branchName?: string;
    onSubmit?: (payload: SetoranTabunganPayload) => void | Promise<void>;
    onBack?: () => void;
}

function formatRupiah(value: string): string {
    if (!value) return "";

    return new Intl.NumberFormat("id-ID").format(Number(value));
}

function parseAmount(value: string): string {
    return value.replace(/\D/g, "");
}

function formatAccountNumber(value: string): string {
    return value.replace(/\D/g, "").slice(0, 20);
}

export default function SetoranTabunganPage({
    kodeCabang = "01",
    branchName = "Cabang Pusat",
    onSubmit,
    onBack,
}: SetoranTabunganPageProps) {
    const [noTab, setNoTab] = useState("");
    const [setor, setSetor] = useState("");

    const [keterangan, setKeterangan] = useState("");
    const [sumberDana, setSumberDana] = useState("");
    const [tujuanTransaksi, setTujuanTransaksi] = useState("");

    const [showAdditionalFields, setShowAdditionalFields] = useState(false);

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const nominal = Number(setor || "");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");

        const accountNumber = noTab.trim();

        if (!accountNumber) {
            setError("Silakan masukkan nomor rekening tabungan.");
            return;
        }

        if (!/^\d+$/.test(accountNumber)) {
            setError("Nomor rekening hanya boleh berisi angka.");
            return;
        }

        if (!setor || !Number.isSafeInteger(nominal) || nominal <= 0) {
            setError("Nominal setoran harus lebih besar dari Rp0.");
            return;
        }

        const payload: SetoranTabunganPayload = {
            kodeCabang,
            noTab: accountNumber,
            setor,
            tarik: "0",
            keterangan: keterangan.trim(),
            sumberDana: sumberDana.trim(),
            tujuanTransaksi: tujuanTransaksi.trim(),
        };

        if (!onSubmit) {
            console.log("Payload setoran:", payload);
            return;
        }

        setIsSubmitting(true);

        try {
            await onSubmit(payload);
        } catch {
            setError(
                "Terjadi kesalahan saat memproses data. Silakan coba kembali.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="flex min-h-screen flex-col bg-[#f7f7f8] text-slate-900">
            {/* Top accent */}
            <div className="flex h-2 shrink-0 sm:h-3">
                <div className="w-[44%] bg-blue-700" />
                <div className="flex-1 bg-red-600" />
            </div>

            {/* Header */}
            <header className="shrink-0 border-b bg-white">
                <div className="mx-auto flex h-[68px] max-w-[1440px] items-center justify-between px-5 sm:px-8">
                    <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600 text-white">
                            <HugeiconsIcon icon={BankIcon} size={23} />
                        </div>

                        <div>
                            <h1 className="text-base font-bold tracking-tight sm:text-lg">
                                Bank Wonosobo
                            </h1>
                            <p className="text-xs text-slate-500">BW TAB</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 sm:gap-6">
                        <span className="hidden text-sm font-medium text-slate-600 sm:block">
                            {branchName}
                        </span>

                        <button
                            type="button"
                            aria-label="Profil pengguna"
                            className="flex size-9 items-center justify-center rounded-full bg-slate-100 text-slate-600 transition-colors hover:bg-slate-200"
                        >
                            <HugeiconsIcon icon={UserCircleIcon} size={21} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main */}
            <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 lg:px-8">
                {/* Breadcrumb */}
                <button
                    type="button"
                    onClick={onBack}
                    className="mb-4 inline-flex w-fit items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-blue-700"
                >
                    <HugeiconsIcon icon={ArrowLeft01Icon} size={18} />
                    Kembali ke pilihan layanan
                </button>

                {/* Heading */}
                <div className="mb-5">
                    <div className="flex gap-3">
                        <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                            <HugeiconsIcon icon={Wallet01Icon} size={25} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold tracking-tight">
                                Setoran Tabungan
                            </h2>

                            <p className="mt-1 text-sm text-slate-500">
                                Isi nomor rekening dan nominal setoran Anda.
                            </p>
                        </div>
                    </div>

                    {/* Step indicator */}
                    {/* <div className="mt-4 flex items-center gap-2">
            <div className="h-1 flex-1 rounded-full bg-blue-600" />
            <div className="h-1 flex-1 rounded-full bg-slate-200" />
            <div className="h-1 flex-1 rounded-full bg-slate-200" />
          </div> */}

                    <p className="mt-1.5 text-xs text-slate-500">
                        Langkah 1 dari 3 · Data setoran
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex-1">
                    <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                        {/* Left column */}
                        <div className="space-y-4">
                            {/* Account number */}
                            <Card className="rounded-xl border-slate-200 shadow-sm">
                                <CardContent className="p-4">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <HugeiconsIcon
                                                icon={BankIcon}
                                                size={21}
                                            />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                Rekening Tujuan
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Masukkan nomor rekening Anda.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="noTab"
                                            className="text-sm font-semibold"
                                        >
                                            Nomor rekening
                                            <span className="ml-1 text-red-500">
                                                *
                                            </span>
                                        </Label>

                                        <Input
                                            id="noTab"
                                            name="noTab"
                                            type="text"
                                            inputMode="numeric"
                                            autoComplete="off"
                                            placeholder="Contoh: 10010155765"
                                            value={noTab}
                                            onChange={(event) => {
                                                setNoTab(
                                                    formatAccountNumber(
                                                        event.target.value,
                                                    ),
                                                );
                                                setError("");
                                            }}
                                            className="h-12 touch-manipulation rounded-xl border-slate-300 px-3 text-base font-medium tracking-wide"
                                            required
                                        />

                                        <p className="text-xs text-slate-500">
                                            Periksa kembali nomor rekening Anda.
                                        </p>
                                    </div>
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <HugeiconsIcon
                                                icon={MoneyReceiveSquareIcon}
                                                size={21}
                                            />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                Nominal Setoran
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Berapa uang yang ingin Anda
                                                setorkan?
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2 mt-5">
                                        <Label
                                            htmlFor="setor"
                                            className="text-sm font-semibold"
                                        >
                                            Jumlah setoran
                                            <span className="ml-1 text-red-500">
                                                *
                                            </span>
                                        </Label>

                                        <div className="flex h-16 items-center rounded-xl border-2 border-blue-200 bg-blue-50/50 px-4 transition-colors focus-within:border-blue-500">
                                            <span className="mr-3 text-lg font-semibold text-slate-500">
                                                Rp
                                            </span>
                                            {setor}
                                            <Input
                                                id="setor"
                                                name="setor"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder="0"
                                                value={formatRupiah(setor)}
                                                onChange={(event) => {
                                                    setSetor(
                                                        parseAmount(
                                                            event.target.value,
                                                        ),
                                                    );
                                                    setError("");
                                                }}
                                                className="h-full border-0 bg-transparent p-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Quick amounts */}
                                    <div className="mt-3">
                                        <p className="mb-2 text-xs text-slate-500">
                                            Pilih nominal cepat
                                        </p>

                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {[
                                                "100000",
                                                "500000",
                                                "1000000",
                                                "5000000",
                                            ].map((amount) => (
                                                <Button
                                                    key={amount}
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSetor(amount);
                                                        setError("");
                                                    }}
                                                    className={cn(
                                                        "h-10 rounded-lg px-1 text-xs font-semibold",
                                                        setor === amount &&
                                                            "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-700",
                                                    )}
                                                >
                                                    Rp {formatRupiah(amount)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="rounded-xl border-slate-200 shadow-sm">
                                <CardContent className="p-4">
                                    <button
                                        type="button"
                                        aria-expanded={showAdditionalFields}
                                        onClick={() =>
                                            setShowAdditionalFields(
                                                (value) => !value,
                                            )
                                        }
                                        className="flex w-full items-center justify-between gap-3 text-left"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                                                <HugeiconsIcon
                                                    icon={InformationCircleIcon}
                                                    size={21}
                                                />
                                            </div>

                                            <div>
                                                <h3 className="text-sm font-semibold">
                                                    Informasi Tambahan
                                                </h3>
                                                <p className="mt-1 text-xs text-slate-500">
                                                    Opsional · Isi jika
                                                    diperlukan
                                                </p>
                                            </div>
                                        </div>

                                        <HugeiconsIcon
                                            icon={ArrowRight01Icon}
                                            size={20}
                                            className={cn(
                                                "shrink-0 text-slate-400 transition-transform",
                                                showAdditionalFields &&
                                                    "rotate-90",
                                            )}
                                        />
                                    </button>

                                    {showAdditionalFields && (
                                        <div className="mt-4 space-y-3 border-t pt-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="sumberDana">
                                                    Sumber dana (opsional)
                                                </Label>

                                                <Input
                                                    id="sumberDana"
                                                    name="sumberDana"
                                                    placeholder="Contoh: Gaji atau hasil usaha"
                                                    value={sumberDana}
                                                    onChange={(event) =>
                                                        setSumberDana(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-10 rounded-lg"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="tujuanTransaksi">
                                                    Tujuan transaksi (opsional)
                                                </Label>

                                                <Input
                                                    id="tujuanTransaksi"
                                                    name="tujuanTransaksi"
                                                    placeholder="Contoh: Tabungan pribadi"
                                                    value={tujuanTransaksi}
                                                    onChange={(event) =>
                                                        setTujuanTransaksi(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-10 rounded-lg"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="keterangan">
                                                    Keterangan (opsional)
                                                </Label>

                                                <Textarea
                                                    id="keterangan"
                                                    name="keterangan"
                                                    placeholder="Tambahkan catatan jika diperlukan"
                                                    value={keterangan}
                                                    onChange={(event) =>
                                                        setKeterangan(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="min-h-16 resize-none rounded-lg"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                            {/* Amount */}
                        </div>

                        {/* Right column */}
                        <div className="space-y-4">
                            {/* Optional information */}
                            <Card className="overflow-hidden rounded-xl border-blue-100 shadow-sm">
                                <div className="h-1 bg-blue-600" />

                                <CardContent className="p-4">
                                    <div className="mb-4 flex items-center gap-3">
                                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                            <HugeiconsIcon
                                                icon={MoneyReceiveSquareIcon}
                                                size={21}
                                            />
                                        </div>

                                        <div>
                                            <h3 className="text-sm font-semibold">
                                                Nominal Setoran
                                            </h3>
                                            <p className="text-xs text-slate-500">
                                                Berapa uang yang ingin Anda
                                                setorkan?
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label
                                            htmlFor="setor"
                                            className="text-sm font-semibold"
                                        >
                                            Jumlah setoran
                                            <span className="ml-1 text-red-500">
                                                *
                                            </span>
                                        </Label>

                                        <div className="flex h-16 items-center rounded-xl border-2 border-blue-200 bg-blue-50/50 px-4 transition-colors focus-within:border-blue-500">
                                            <span className="mr-3 text-lg font-semibold text-slate-500">
                                                Rp
                                            </span>
                                            {setor}
                                            <Input
                                                id="setor"
                                                name="setor"
                                                type="text"
                                                inputMode="numeric"
                                                autoComplete="off"
                                                placeholder="0"
                                                value={formatRupiah(setor)}
                                                onChange={(event) => {
                                                    setSetor(
                                                        parseAmount(
                                                            event.target.value,
                                                        ),
                                                    );
                                                    setError("");
                                                }}
                                                className="h-full border-0 bg-transparent p-0 text-2xl font-bold tracking-tight shadow-none focus-visible:ring-0"
                                                required
                                            />
                                        </div>
                                    </div>

                                    {/* Quick amounts */}
                                    <div className="mt-3">
                                        <p className="mb-2 text-xs text-slate-500">
                                            Pilih nominal cepat
                                        </p>

                                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                            {[
                                                "100000",
                                                "500000",
                                                "1000000",
                                                "5000000",
                                            ].map((amount) => (
                                                <Button
                                                    key={amount}
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setSetor(amount);
                                                        setError("");
                                                    }}
                                                    className={cn(
                                                        "h-10 rounded-lg px-1 text-xs font-semibold",
                                                        setor === amount &&
                                                            "border-blue-500 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-700",
                                                    )}
                                                >
                                                    Rp {formatRupiah(amount)}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Summary */}
                            <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
                                <HugeiconsIcon
                                    icon={CheckmarkCircle01Icon}
                                    size={20}
                                    className="shrink-0 text-emerald-600"
                                />

                                <div>
                                    <p className="text-sm font-semibold text-emerald-900">
                                        Periksa data Anda
                                    </p>

                                    <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                                        Pastikan nomor rekening dan nominal
                                        setoran sudah benar sebelum melanjutkan.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div
                                role="alert"
                                className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 lg:col-span-2"
                            >
                                <HugeiconsIcon
                                    icon={InformationCircleIcon}
                                    size={20}
                                    className="mt-0.5 shrink-0"
                                />
                                <p>{error}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:justify-between lg:col-span-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={onBack}
                                className="h-11 rounded-xl px-5"
                            >
                                <HugeiconsIcon
                                    icon={ArrowLeft01Icon}
                                    size={18}
                                    className="mr-2"
                                />
                                Kembali
                            </Button>

                            <Button
                                type="submit"
                                disabled={
                                    isSubmitting ||
                                    !noTab.trim() ||
                                    !setor ||
                                    !Number.isSafeInteger(nominal) ||
                                    nominal <= 0
                                }
                                className="h-11 rounded-xl bg-blue-600 px-7 font-semibold hover:bg-blue-700 sm:min-w-48"
                            >
                                {isSubmitting
                                    ? "Memproses..."
                                    : "Validasi data"}

                                <HugeiconsIcon
                                    icon={CheckmarkCircle01Icon}
                                    size={18}
                                    className="ml-2"
                                />
                            </Button>
                        </div>
                    </div>
                </form>

                <footer className="mt-4 pb-1 text-center">
                    <p className="text-xs text-slate-400">
                        Bank Wonosobo · BW TAB
                    </p>
                </footer>
            </main>
        </div>
    );
}
