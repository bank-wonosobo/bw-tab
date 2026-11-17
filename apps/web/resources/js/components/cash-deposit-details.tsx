import { printCashDepositSlip } from '@/components/cash-deposit-slip';
import { time, type CashDeposit } from '@/types/queue';
import { router } from '@inertiajs/react';
import { useState } from 'react';

export function CashDepositDetails({
    deposit,
    branchId,
    ticketId,
}: {
    deposit: CashDeposit;
    branchId?: string;
    ticketId?: string;
}) {
    const [editing, setEditing] = useState(false);
    const [amount, setAmount] = useState(String(Number(deposit.amount)));
    const [saving, setSaving] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const isWithdrawal = deposit.transaction_type === 'tarik_tunai';
    const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(deposit.amount));
    const copyValue = async (key: string, value: string) => {
        await navigator.clipboard.writeText(value);
        setCopied(key);
        window.setTimeout(() => setCopied(null), 1500);
    };
    const printSlip = () => printCashDepositSlip(deposit);
    const saveAmount = () => {
        if (!branchId || !ticketId) return;
        setSaving(true);
        router.post(
            '/admin/queue/deposit/amount',
            {
                branch_id: branchId,
                ticket_id: ticketId,
                amount,
            },
            {
                preserveScroll: true,
                onSuccess: () => setEditing(false),
                onFinish: () => setSaving(false),
            },
        );
    };
    const rows: [string, string | null][] = [
        ['Jenis transaksi', deposit.transaction_type],
        ['Kode cabang bank', deposit.bank_branch_code],
        ['Nomor rekening', deposit.account_reference],
        ['Nomor yang diinput', deposit.account_number],
        ['Pemilik rekening', deposit.customer_name],
        ['Alamat nasabah', deposit.customer_address],
        [isWithdrawal ? 'Nama penarik' : 'Nama penyetor', deposit.sender_name],
        [
            isWithdrawal ? 'Alamat penarik' : 'Alamat penyetor',
            deposit.sender_address,
        ],
        ['Sumber dana', deposit.source_of_funds],
        ['Tujuan transaksi', deposit.transaction_purpose],
        ['Keterangan', deposit.notes],
    ];
    return (
        <section className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="font-semibold text-slate-900">
                        Data transaksi nasabah
                    </h3>
                    <p className="mt-1 text-xs text-emerald-700">
                        Rekening dicek melalui API · {time(deposit.verified_at)}
                    </p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {editing ? (
                        <div className="flex items-center gap-2">
                            <input
                                className="field w-36"
                                inputMode="numeric"
                                value={amount}
                                onChange={(event) =>
                                    setAmount(
                                        event.target.value.replace(
                                            /[^0-9]/g,
                                            '',
                                        ),
                                    )
                                }
                                aria-label="Nominal setoran"
                            />
                            <button
                                type="button"
                                className="action"
                                disabled={saving || !amount}
                                onClick={saveAmount}
                            >
                                Simpan
                            </button>
                            <button
                                type="button"
                                className="action-secondary"
                                disabled={saving}
                                onClick={() => {
                                    setAmount(String(Number(deposit.amount)));
                                    setEditing(false);
                                }}
                            >
                                Batal
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-2xl font-bold text-primary">
                                {formattedAmount}
                            </p>
                            {branchId && ticketId && (
                                <button
                                    type="button"
                                    className="action-secondary"
                                    onClick={() => setEditing(true)}
                                >
                                    Edit nominal
                                </button>
                            )}
                        </>
                    )}
                    <button
                        type="button"
                        className="action-secondary"
                        onClick={printSlip}
                    >
                        Print slip
                    </button>
                </div>
            </div>
            <dl className="grid gap-4 text-sm sm:grid-cols-2">
                {rows.map(([label, value]) => (
                    <div key={label}>
                        <dt className="text-xs text-slate-500">{label}</dt>
                        <dd className="mt-1 flex items-center gap-2 font-medium break-words text-slate-900">
                            <span>{value || '—'}</span>
                            {['Nomor rekening', 'Nomor yang diinput'].includes(
                                label,
                            ) &&
                                value && (
                                    <button
                                        type="button"
                                        className="text-xs font-semibold text-primary"
                                        onClick={() =>
                                            copyValue(label, String(value))
                                        }
                                    >
                                        {copied === label ? 'Tersalin' : 'Copy'}
                                    </button>
                                )}
                        </dd>
                    </div>
                ))}
            </dl>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-600">
                <span>Nominal: {formattedAmount}</span>
                <button
                    type="button"
                    className="font-semibold text-primary"
                    onClick={() =>
                        copyValue('Nominal', String(Number(deposit.amount)))
                    }
                >
                    {copied === 'Nominal' ? 'Tersalin' : 'Copy nominal'}
                </button>
            </div>
            <p className="mt-5 border-t border-blue-100 pt-4 text-xs leading-5 text-slate-600">
                Data ini adalah instruksi setoran nasabah. Cocokkan rekening,
                identitas, dan uang tunai sebelum memproses transaksi pada
                sistem perbankan.
            </p>
        </section>
    );
}
