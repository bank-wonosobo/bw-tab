import { time, type CashDeposit } from '@/types/queue';
import { printCashLoanSlip } from '@/components/cash-loan-slip';
import { Fragment } from 'react';
import { createRoot } from 'react-dom/client';

const numberWords = [
    'nol',
    'satu',
    'dua',
    'tiga',
    'empat',
    'lima',
    'enam',
    'tujuh',
    'delapan',
    'sembilan',
    'sepuluh',
    'sebelas',
];

function terbilang(value: number): string {
    const number = Math.floor(value);
    if (number < 12) return numberWords[number];
    if (number < 20) return `${terbilang(number - 10)} belas`;
    if (number < 100) {
        return `${terbilang(Math.floor(number / 10))} puluh${number % 10 ? ` ${terbilang(number % 10)}` : ''}`;
    }
    if (number < 200)
        return `seratus${number % 100 ? ` ${terbilang(number % 100)}` : ''}`;
    if (number < 1000) {
        return `${terbilang(Math.floor(number / 100))} ratus${number % 100 ? ` ${terbilang(number % 100)}` : ''}`;
    }
    if (number < 2000)
        return `seribu${number % 1000 ? ` ${terbilang(number % 1000)}` : ''}`;
    if (number < 1_000_000) {
        return `${terbilang(Math.floor(number / 1000))} ribu${number % 1000 ? ` ${terbilang(number % 1000)}` : ''}`;
    }
    if (number < 1_000_000_000) {
        return `${terbilang(Math.floor(number / 1_000_000))} juta${number % 1_000_000 ? ` ${terbilang(number % 1_000_000)}` : ''}`;
    }
    if (number < 1_000_000_000_000) {
        return `${terbilang(Math.floor(number / 1_000_000_000))} miliar${number % 1_000_000_000 ? ` ${terbilang(number % 1_000_000_000)}` : ''}`;
    }
    return `${terbilang(Math.floor(number / 1_000_000_000_000))} triliun${number % 1_000_000_000_000 ? ` ${terbilang(number % 1_000_000_000_000)}` : ''}`;
}

const currency = (value: string) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));

export function CashDepositSlip({ deposit }: { deposit: CashDeposit }) {
    const amount = Number(deposit.amount);
    const slipCreatedAt = time(new Date().toISOString());
    const rows = [
        // ["Jenis transaksi", isWithdrawal ? "Penarikan tunai" : "Setoran"],
        ['Nomor rekening', deposit.account_reference],
        // ["Nomor yang diinput", deposit.account_number],
        ['Pemilik rekening', deposit.customer_name],
        ['Alamat penyetor', deposit.customer_address],

        // [isWithdrawal ? "Nama penarik" : "Nama penyetor", deposit.sender_name],
        // ["Tanggal", time(deposit.verified_at)],
    ];

    return (
        <>
            <style>{`
                @page { size: auto; margin: 0; }
                * { box-sizing: border-box; }
                html, body { width: 21cm; height: 10cm; margin: 0; padding: 0; background: white; }
                body { font-family: Arial, sans-serif; }
                .cash-deposit-slip { width: 100%; padding: 0.65cm 0.8cm; }
                .slip-header { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; solid #111; padding-bottom: 0.25cm; margin-top: 2.54cm; }
                .slip-brand { font-size: 16px; font-weight: 700; }
                .slip-title { font-size: 15px; font-weight: 700; text-align: right; }
                .slip-subtitle { padding-right: 12px; padding-bottom: 10px; font-size: 12px; text-align: right; }
                .slip-content { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(5.5cm, 0.75fr); gap: 0.8cm; align-items: start;  }
                .slip-details { display: grid; grid-template-columns: 3.1cm 1fr; gap: 0.2cm 0.25cm; align-content: start; font-size: 12px; margin-left: 2.1cm; }
                .slip-details-kanan { display: grid; grid-template-columns: 3.1cm 1fr; gap: 0.2cm 0.25cm; align-content: start; font-size: 14px; margin-left: 1cm; }
                .slip-label { }
                .slip-value { font-weight: 600; word-break: break-word; }
                .slip-amount { border: 1px solid #111; padding: 0.35cm; text-align: center; }
                .slip-amount-label { font-size: 10px; font-weight: 700; text-transform: uppercase; }
                .slip-amount-value { margin-top: 0.18cm; font-size: 22px; font-weight: 700; }
                .slip-amount-words { margin-top: 0.15cm; font-size: 11px; font-style: italic; text-transform: capitalize; }
                .slip-footer { margin-top: 0.35cm; border-top: 1px solid #bbb; padding-top: 0.15cm; font-size: 9px; }
                @media screen { .cash-deposit-slip { margin: 0 auto; box-shadow: 0 0 12px #bbb; } }
                @media print {
                    html, body { width: 21cm; height: 10cm; min-height: 0; overflow: hidden; }
                    .cash-deposit-slip { width: 21cm; height: auto; min-height: 0; break-after: avoid-page; page-break-after: avoid; }
                }
            `}</style>
            <main className="cash-deposit-slip">
                <header className="slip-header">
                    <div className="slip-brand"></div>
                    <div>
                        {/* <div className="slip-title">SLIP </div> */}
                        <div className="slip-subtitle">{slipCreatedAt}</div>
                    </div>
                </header>
                <div className="slip-content">
                    <div className="slip-details">
                        {rows.map(([label, value]) => (
                            <Fragment key={label}>
                                <div className="slip-label"></div>
                                <div className="slip-value">{value || '—'}</div>
                            </Fragment>
                        ))}
                    </div>
                    <section className="slip-details-kanan">
                        <Fragment>
                            <div className="slip-label"></div>
                            <div className="slip-value">
                                {currency(deposit.amount)}
                            </div>
                        </Fragment>
                        <Fragment>
                            <div className="slip-label"></div>
                            <div className="slip-value">
                                {terbilang(amount)} rupiah
                            </div>
                        </Fragment>
                    </section>
                </div>
                {/* <footer className="slip-footer">
                    Simpan slip ini sebagai bukti transaksi.
                </footer> */}
            </main>
        </>
    );
}

export function printCashDepositSlip(deposit: CashDeposit): void {
    if (deposit.transaction_type === 'pinjaman') {
        printCashLoanSlip(deposit);
        return;
    }
    const printWindow = window.open('', '_blank', 'width=850,height=450');
    if (!printWindow) return;
    printWindow.document.write(
        '<!doctype html><html><head><title>Slip transaksi</title></head><body><div id="cash-deposit-slip-root"></div></body></html>',
    );
    printWindow.document.close();
    const root = createRoot(
        printWindow.document.getElementById('cash-deposit-slip-root')!,
    );
    root.render(<CashDepositSlip deposit={deposit} />);
    printWindow.onafterprint = () => {
        root.unmount();
        printWindow.close();
    };
    printWindow.setTimeout(() => printWindow.print(), 100);
}
