"use client";

import {
    ArrowLeft01Icon,
    BankIcon,
    CheckmarkCircle01Icon,
    InformationCircleIcon,
    UserCircleIcon,
    Wallet01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useState, type FormEvent } from "react";

import { NumericKeypad } from "@/components/numeric-keypad";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface SetoranTabunganPageProps {
    kodeCabang?: string;
    branchName?: string;

    onBack?: () => void;
}

function formatAccountNumber(value: string): string {
    return value.replace(/\D/g, "").slice(0, 20);
}

type TabunganResponse = {
    Tgl: "4 November 2026";
    KodeCabang: "01";
    NoTab: "10.01.01.55765";
    NasabahID: "149087";
    Nama: "BAMBANG TRIYONO";
    Alamat: "SELANG 002/005 SELANG KEBUMEN";
    NamaTrans: "BAMBANG TRIYONO";
    AlamatTrans: "SELANG 002/005 SELANG KEBUMEN";
    Saldo: 1142299;
    Nominal: 0;
    NominalTerbilang: "";
    NoIdentitas: "3305141009770002";
    Keterangan: "";
    SumberDana: "";
    TujuanTransaksi: "";
};

function formatRupiah(value: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        maximumFractionDigits: 0,
    }).format(value);
}

export default function SetoranTabunganPage({
    branchName = "Cabang Pusat",
    onBack,
}: SetoranTabunganPageProps) {
    const [noTab, setNoTab] = useState("");
    const [tabungan, setTabungan] = useState<TabunganResponse | null>(null);

    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setTabungan(null);
        setIsSubmitting(true);

        try {
            const response = await fetch(
                `https://api.bankwonosobo.com:8445/slip/tabungan`,
                {
                    method: "POST",
                    headers: {
                        Accept: "application/json",
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        kodeCabang: "01",
                        noTab: "10010155098",
                        setor: "0",
                        tarik: "0",
                        namaTrans: "",
                        alamatTrans: "",
                        keterangan: "",
                        sumberDana: "",
                        tujuanTransaksi: "",
                    }),
                },
            );

            if (!response.ok) {
                throw new Error(`Request gagal (${response.status}).`);
            }

            const data: unknown = await response.json();

            if (!Array.isArray(data) || data.length === 0) {
                throw new Error("Data pinjaman tidak ditemukan.");
            }

            setTabungan(data[0] as TabunganResponse);
        } catch (caughtError) {
            setError(
                caughtError instanceof Error
                    ? caughtError.message
                    : "Tidak dapat mengambil data pinjaman.",
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            <NumericKeypad />
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
                                <HugeiconsIcon
                                    icon={UserCircleIcon}
                                    size={21}
                                />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main */}
                <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-5 sm:px-8 lg:px-8">
                    {/* Heading */}
                    <div className="mb-5">
                        <div className="flex gap-3 items-center">
                            <div className="mb-2 flex size-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                                <HugeiconsIcon icon={Wallet01Icon} size={25} />
                            </div>

                            <div>
                                <h2 className="text-2xl font-bold tracking-tight">
                                    Setoran Tabungan
                                </h2>
                            </div>
                        </div>

                        <p className="mt-1.5 text-xs text-slate-500">
                            Langkah 1 dari 3 · Data setoran
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="flex-1">
                        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
                            {/* Left column */}
                            <div className="space-y-4">
                                {/* Account number */}
                                <Card className="rounded-xl border-slate-200 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
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
                                                    Masukkan nomor rekening
                                                    Anda.
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
                                                inputMode="none"
                                                data-numeric-keypad
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
                                                Periksa kembali nomor rekening
                                                Anda.
                                            </p>
                                        </div>

                                        <div className="flex justify-end mt-2">
                                            <Button
                                                type="submit"
                                                className="h-11 rounded-xl bg-blue-600 px-7 font-semibold hover:bg-blue-700 sm:min-w-48"
                                            >
                                                <HugeiconsIcon
                                                    icon={CheckmarkCircle01Icon}
                                                    size={18}
                                                    className="ml-2"
                                                />

                                                {isSubmitting
                                                    ? "Memproses..."
                                                    : "Cek Rekening"}
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* Right column */}
                            <div className="space-y-4">
                                {tabungan && (
                                    <Card className="rounded-xl border-emerald-200 bg-emerald-50 shadow-sm">
                                        <CardContent className="space-y-2 p-4 text-sm">
                                            <div className="flex items-center gap-2 font-semibold text-emerald-900">
                                                <HugeiconsIcon
                                                    icon={CheckmarkCircle01Icon}
                                                    size={19}
                                                />
                                                Data tabungan ditemukan
                                            </div>
                                            <p>
                                                <span className="text-slate-500">
                                                    Nasabah:
                                                </span>{" "}
                                                {tabungan.Nama}
                                            </p>
                                            <p>
                                                <span className="text-slate-500">
                                                    Nomor tabungan:
                                                </span>{" "}
                                                {tabungan.NoTab}
                                            </p>
                                            <p>
                                                <span className="text-slate-500">
                                                    Saldo:
                                                </span>{" "}
                                                {formatRupiah(tabungan.Saldo)}
                                            </p>
                                            <p>
                                                <span className="text-slate-500">
                                                    Nominal:
                                                </span>{" "}
                                                {formatRupiah(tabungan.Nominal)}
                                            </p>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* Summary */}
                                {/* <div className="flex items-start gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-3">
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
                                            setoran sudah benar sebelum
                                            melanjutkan.
                                        </p>
                                    </div>
                                </div> */}
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
        </>
    );
}
