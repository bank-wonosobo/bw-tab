import { NumericKeypad } from '@/components/numeric-keypad';
import { Feedback } from '@/components/queue-common';
import { createRequestId } from '@/lib/request-id';
import ClientLayout from '@/layouts/client-layout';
import { branch as branchHome } from '@/routes/client';
import { lookup as lookupAccount } from '@/routes/client/account';
import { store as storeTicket } from '@/routes/client/branch';
import type { Branch, Service } from '@/types/queue';
import { Head, Link, useForm, useHttp, usePoll } from '@inertiajs/react';
import { useRef, useState } from 'react';

type Account = {
    customer_name: string;
    customer_address: string;
    account_reference: string;
};
type Field = 'account_number' | 'amount';
type Props = { branch: Branch; service: Service; isOpen: boolean };
const presets = [
    { value: 10000, label: 'Rp10 rb' },
    { value: 50000, label: 'Rp50 rb' },
    { value: 100000, label: 'Rp100 rb' },
    { value: 200000, label: 'Rp200 rb' },
    { value: 500000, label: 'Rp500 rb' },
    { value: 1000000, label: 'Rp1 jt' },
];
const rupiah = (amount: string) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(amount || 0));

export default function Deposit({ branch, service, isOpen }: Props) {
    usePoll(5000, { only: ['isOpen'] });
    const accountRef = useRef<HTMLInputElement>(null);
    const amountRef = useRef<HTMLInputElement>(null);
    const [activeField, setActiveField] = useState<Field | null>(
        'account_number',
    );
    const [account, setAccount] = useState<Account | null>(null);
    const [lookupError, setLookupError] = useState('');
    const [senderEdited, setSenderEdited] = useState(false);
    const form = useForm({
        branch_id: branch.id,
        service_id: service.id,
        request_id: createRequestId(),
        account_number: '',
        amount: '',
        sender_name: '',
        sender_address: '',
        notes: '',
        source_of_funds: '',
        transaction_purpose: '',
    });
    const lookup = useHttp<
        { service_id: string; account_number: string; request_id: string },
        { account: Account }
    >({ service_id: '', account_number: '', request_id: '' });
    const locked = form.processing || lookup.processing;
    const isWithdrawal = service.transaction_type === 'tarik_tunai';
    const transactionLabel = isWithdrawal ? 'penarikan' : 'setoran';
    const transactionLabelTitle = isWithdrawal ? 'Penarikan' : 'Setoran';
    const canCheck =
        !locked &&
        isOpen &&
        Boolean(branch.bank_code) &&
        form.data.account_number.length >= 5;
    const canSubmit =
        !locked &&
        isOpen &&
        Boolean(account) &&
        /^[1-9][0-9]{0,12}$/.test(form.data.amount);

    function updateField(field: Field, value: string) {
        const next = value
            .replace(/\D/g, '')
            .slice(0, field === 'account_number' ? 30 : 13);
        if (field === 'account_number') {
            if (next === form.data.account_number) return;
            form.setData((current) => ({
                ...current,
                account_number: next,
                request_id: createRequestId(),
            }));
            setAccount(null);
            lookup.clearErrors();
            setLookupError('');
            form.clearErrors('account_number');
        } else {
            form.setData('amount', next);
            form.clearErrors('amount');
        }
    }

    async function checkAccount() {
        if (!canCheck) return;
        setAccount(null);
        setLookupError('');
        lookup.clearErrors();
        form.clearErrors();
        lookup.transform(() => ({
            service_id: service.id,
            account_number: form.data.account_number,
            request_id: form.data.request_id,
        }));
        try {
            const result = await lookup.post(lookupAccount.url(branch.slug));
            setAccount(result.account);
            if (!senderEdited)
                form.setData('sender_name', result.account.customer_name);
            setActiveField('amount');
            requestAnimationFrame(() =>
                amountRef.current?.focus({ preventScroll: true }),
            );
        } catch {
            setLookupError(
                'Rekening belum berhasil diperiksa. Periksa nomor rekening atau coba kembali.',
            );
        }
    }

    return (
        <ClientLayout branchSlug={branch.slug} branchId={branch.id}>
            <Head title={`${service.name} · ${branch.name}`} />
            <div className="mx-auto max-w-6xl px-4 pb-8">
                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                        <Link
                            href={branchHome.url(branch.slug)}
                            className="mb-2 inline-block text-sm font-medium text-primary"
                        >
                            ← Kembali ke pilihan layanan
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight">
                            {service.name}
                        </h1>
                        <p className="mt-1 text-sm text-slate-500">
                            {branch.name} · Masukkan nomor rekening dan jumlah{' '}
                            {transactionLabel}.
                        </p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-primary">
                        FORMULIR {transactionLabelTitle.toUpperCase()}
                    </span>
                </div>
                <Feedback />
                {!isOpen && (
                    <p
                        role="status"
                        className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                    >
                        Sesi antrean belum dibuka. Silakan hubungi petugas.
                    </p>
                )}
                {!branch.bank_code && (
                    <p
                        role="alert"
                        className="mb-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"
                    >
                        Pengecekan rekening kantor ini belum tersedia. Silakan
                        hubungi petugas.
                    </p>
                )}
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (canSubmit) form.post(storeTicket.url(branch.slug));
                    }}
                    className="grid items-start gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(260px,0.8fr)] lg:grid-cols-[minmax(0,1fr)_360px]"
                >
                    <section className="panel space-y-5">
                        <div>
                            <label
                                htmlFor="account-number"
                                className="mb-2 block text-sm font-semibold"
                            >
                                1. Nomor rekening
                            </label>
                            <div className="flex gap-2">
                                <input
                                    ref={accountRef}
                                    id="account-number"
                                    name="account_number"
                                    type="text"
                                    inputMode="none"
                                    autoComplete="off"
                                    autoFocus
                                    data-numeric-keypad
                                    required
                                    pattern="[0-9]{5,30}"
                                    maxLength={30}
                                    disabled={locked}
                                    value={form.data.account_number}
                                    placeholder="Nomor rekening Anda"
                                    aria-describedby="account-help"
                                    onFocus={() =>
                                        setActiveField('account_number')
                                    }
                                    onChange={(e) =>
                                        updateField(
                                            'account_number',
                                            e.target.value,
                                        )
                                    }
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            void checkAccount();
                                        }
                                    }}
                                    className={`field min-h-14 min-w-0 flex-1 text-lg! font-semibold ${activeField === 'account_number' ? 'border-primary! ring-2 ring-blue-100' : ''}`}
                                />
                                <button
                                    type="button"
                                    className="action shrink-0 rounded-xl"
                                    disabled={!canCheck}
                                    onClick={() => void checkAccount()}
                                >
                                    {lookup.processing
                                        ? 'Memeriksa…'
                                        : 'Cek rekening'}
                                </button>
                            </div>
                            <p
                                id="account-help"
                                className="mt-2 text-xs text-slate-500"
                            >
                                Gunakan keyboard angka di kanan untuk mengisi
                                rekening.
                            </p>
                            {lookupError && (
                                <p
                                    role="alert"
                                    className="mt-2 text-sm text-red-700"
                                >
                                    {lookupError}
                                </p>
                            )}
                            {Object.entries(lookup.errors).map(
                                ([key, error]) => (
                                    <p
                                        role="alert"
                                        className="mt-2 text-sm text-red-700"
                                        key={key}
                                    >
                                        {error}
                                    </p>
                                ),
                            )}
                            {account && (
                                <div
                                    role="status"
                                    className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3"
                                >
                                    <p className="text-xs font-semibold text-emerald-700">
                                        REKENING TERVERIFIKASI
                                    </p>
                                    <p className="mt-1 font-bold text-slate-900">
                                        {account.customer_name}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-600">
                                        {account.account_reference}
                                    </p>
                                </div>
                            )}
                        </div>
                        <div>
                            <label
                                htmlFor="deposit-amount"
                                className="mb-2 block text-sm font-semibold"
                            >
                                2. Jumlah {transactionLabel} (Rp)
                            </label>
                            <input
                                ref={amountRef}
                                id="deposit-amount"
                                name="amount"
                                type="text"
                                inputMode="none"
                                autoComplete="off"
                                data-numeric-keypad
                                required
                                pattern="[1-9][0-9]{0,12}"
                                maxLength={13}
                                value={form.data.amount}
                                disabled={locked}
                                placeholder={`Masukkan jumlah ${transactionLabel}`}
                                onFocus={() => setActiveField('amount')}
                                onChange={(e) =>
                                    updateField('amount', e.target.value)
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        amountRef.current?.blur();
                                    }
                                }}
                                className={`field min-h-14 text-xl! font-bold ${activeField === 'amount' ? 'border-primary! ring-2 ring-blue-100' : ''}`}
                            />
                            <p
                                className="mt-2 text-lg font-bold text-primary"
                                aria-live="polite"
                            >
                                {rupiah(form.data.amount)}
                            </p>
                            <p className="mt-3 mb-2 text-xs font-medium text-slate-500">
                                Pilih jumlah atau ketik nominal lainnya
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                                {presets.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        disabled={locked}
                                        aria-pressed={
                                            form.data.amount ===
                                            String(preset.value)
                                        }
                                        onPointerDown={(e) =>
                                            e.preventDefault()
                                        }
                                        onClick={() => {
                                            updateField(
                                                'amount',
                                                String(preset.value),
                                            );
                                            setActiveField('amount');
                                            amountRef.current?.focus({
                                                preventScroll: true,
                                            });
                                        }}
                                        className={`min-h-11 touch-manipulation rounded-xl border px-2 text-sm font-semibold transition disabled:opacity-50 ${form.data.amount === String(preset.value) ? 'border-primary bg-blue-50 text-primary ring-1 ring-primary' : 'border-slate-200 bg-white text-slate-700 hover:border-blue-300'}`}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <details className="rounded-xl border border-slate-200 px-4 py-3">
                            <summary className="cursor-pointer text-sm font-medium text-slate-600">
                                Data {isWithdrawal ? 'penarik' : 'penyetor'} &
                                keterangan{' '}
                                <span className="text-xs font-normal text-slate-400">
                                    (opsional)
                                </span>
                            </summary>
                            <div
                                className="mt-4 grid gap-4"
                                onFocusCapture={() => setActiveField(null)}
                            >
                                {(
                                    [
                                        [
                                            'sender_name',
                                            isWithdrawal
                                                ? 'Nama penarik'
                                                : 'Nama penyetor',
                                        ],
                                        ['sender_address', 'Alamat penyetor'],
                                        ['source_of_funds', 'Sumber dana'],
                                        [
                                            'transaction_purpose',
                                            'Tujuan transaksi',
                                        ],
                                        ['notes', 'Keterangan'],
                                    ] as const
                                ).map(([field, label]) => (
                                    <label
                                        key={field}
                                        className="text-sm font-medium"
                                    >
                                        {label}
                                        <input
                                            type="text"
                                            className="field mt-1"
                                            maxLength={
                                                field === 'sender_name'
                                                    ? 150
                                                    : [
                                                            'source_of_funds',
                                                            'transaction_purpose',
                                                        ].includes(field)
                                                      ? 500
                                                      : 2000
                                            }
                                            disabled={locked}
                                            value={form.data[field]}
                                            onChange={(e) => {
                                                form.setData(
                                                    field,
                                                    e.target.value,
                                                );
                                                if (field === 'sender_name')
                                                    setSenderEdited(true);
                                            }}
                                        />
                                    </label>
                                ))}
                            </div>
                        </details>
                        <div>
                            <button
                                type="submit"
                                className="action min-h-14! w-full text-base!"
                                disabled={!canSubmit}
                            >
                                {form.processing
                                    ? `Menyimpan ${transactionLabel}…`
                                    : 'Simpan & ambil nomor antrean →'}
                            </button>
                            <p className="mt-3 text-center text-xs leading-5 text-slate-500">
                                Pastikan rekening dan nominal sesuai. Transaksi
                                akan diproses oleh teller.
                            </p>
                        </div>
                    </section>
                    <aside className="sm:sticky sm:top-5">
                        <NumericKeypad
                            variant="inline"
                            label={
                                activeField === 'account_number'
                                    ? 'Nomor rekening'
                                    : activeField === 'amount'
                                      ? `Jumlah ${transactionLabel}`
                                      : 'Pilih isian angka'
                            }
                            value={activeField ? form.data[activeField] : ''}
                            maxLength={activeField === 'amount' ? 13 : 30}
                            disabled={locked || activeField === null}
                            confirmDisabled={
                                activeField === 'account_number' && !canCheck
                            }
                            confirmLabel={
                                activeField === 'account_number'
                                    ? 'Cek rekening →'
                                    : 'Selesai'
                            }
                            onValueChange={(value) => {
                                if (activeField)
                                    updateField(activeField, value);
                            }}
                            onConfirm={() => {
                                if (activeField === 'account_number')
                                    void checkAccount();
                                else amountRef.current?.blur();
                            }}
                        />
                    </aside>
                </form>
            </div>
        </ClientLayout>
    );
}
