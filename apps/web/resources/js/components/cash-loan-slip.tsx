import { time, type CashDeposit } from '@/types/queue';
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
    if (number < 100)
        return `${terbilang(Math.floor(number / 10))} puluh${number % 10 ? ` ${terbilang(number % 10)}` : ''}`;
    if (number < 200)
        return `seratus${number % 100 ? ` ${terbilang(number % 100)}` : ''}`;
    if (number < 1000)
        return `${terbilang(Math.floor(number / 100))} ratus${number % 100 ? ` ${terbilang(number % 100)}` : ''}`;
    if (number < 2000)
        return `seribu${number % 1000 ? ` ${terbilang(number % 1000)}` : ''}`;
    if (number < 1_000_000)
        return `${terbilang(Math.floor(number / 1000))} ribu${number % 1000 ? ` ${terbilang(number % 1000)}` : ''}`;
    if (number < 1_000_000_000)
        return `${terbilang(Math.floor(number / 1_000_000))} juta${number % 1_000_000 ? ` ${terbilang(number % 1_000_000)}` : ''}`;
    if (number < 1_000_000_000_000)
        return `${terbilang(Math.floor(number / 1_000_000_000))} miliar${number % 1_000_000_000 ? ` ${terbilang(number % 1_000_000_000)}` : ''}`;
    return `${terbilang(Math.floor(number / 1_000_000_000_000))} triliun${number % 1_000_000_000_000 ? ` ${terbilang(number % 1_000_000_000_000)}` : ''}`;
}

const currency = (value: string) =>
    new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
    }).format(Number(value));

export function CashLoanSlip({ deposit }: { deposit: CashDeposit }) {
    const amount = Number(deposit.amount);
    const slipCreatedAt = time(new Date().toISOString());
    const rows = [
        ['Nomor rekening', deposit.account_reference],
        ['Pemilik rekening', deposit.customer_name],
        ['Alamat peminjam', deposit.customer_address],
    ];

    return (
        <>
            <style>{`
                @page { size: auto; margin: 0; }
                * { box-sizing: border-box; }
                html, body { width: 21cm; height: 10cm; margin: 0; padding: 0; background: white; }
                body { font-family: Arial, sans-serif; }
                .cash-loan-slip { width: 100%; padding: 0.65cm 0.8cm; }
                .loan-slip-header { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 0.25cm; margin-top: 2.54cm; }
                .loan-slip-subtitle { padding-right: 12px; padding-bottom: 10px; font-size: 12px; text-align: right; }
                .loan-slip-content { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(5.5cm, 0.75fr); gap: 0.8cm; align-items: start; }
                .loan-slip-details { display: grid; grid-template-columns: 3.1cm 1fr; gap: 0.2cm 0.25cm; align-content: start; font-size: 12px; margin-left: 2.1cm; }
                .loan-slip-details-right { display: grid; grid-template-columns: 3.1cm 1fr; gap: 0.2cm 0.25cm; align-content: start; font-size: 14px; margin-left: 1cm; }
                .loan-slip-value { font-weight: 600; word-break: break-word; }
                @media screen { .cash-loan-slip { margin: 0 auto; box-shadow: 0 0 12px #bbb; } }
                @media print { html, body { width: 21cm; height: 10cm; min-height: 0; overflow: hidden; } .cash-loan-slip { width: 21cm; height: auto; min-height: 0; break-after: avoid-page; page-break-after: avoid; } }
            `}</style>
            <main className="cash-loan-slip">
                <header className="loan-slip-header">
                    <div />
                    <div className="loan-slip-subtitle">{slipCreatedAt}</div>
                </header>
                <div className="loan-slip-content">
                    <div className="loan-slip-details">
                        {rows.map(([label, value]) => (
                            <Fragment key={label}>
                                <div />
                                <div className="loan-slip-value">
                                    {value || '—'}
                                </div>
                            </Fragment>
                        ))}
                    </div>
                    <section className="loan-slip-details-right">
                        <Fragment>
                            <div />
                            <div className="loan-slip-value">
                                {currency(deposit.amount)}
                            </div>
                        </Fragment>
                        <Fragment>
                            <div />
                            <div className="loan-slip-value">
                                {terbilang(amount)} rupiah
                            </div>
                        </Fragment>
                    </section>
                </div>
            </main>
        </>
    );
}

export function printCashLoanSlip(deposit: CashDeposit): void {
    const printWindow = window.open('', '_blank', 'width=850,height=450');
    if (!printWindow) return;
    printWindow.document.write(
        '<!doctype html><html><head><title>Slip pinjaman</title></head><body><div id="cash-loan-slip-root"></div></body></html>',
    );
    printWindow.document.close();
    const root = createRoot(
        printWindow.document.getElementById('cash-loan-slip-root')!,
    );
    root.render(<CashLoanSlip deposit={deposit} />);
    printWindow.onafterprint = () => {
        root.unmount();
        printWindow.close();
    };
    printWindow.setTimeout(() => printWindow.print(), 100);
}
