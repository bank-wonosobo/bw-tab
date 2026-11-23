import { time, type CashDeposit } from "@/types/queue";
import { createRoot } from "react-dom/client";

const numberWords = [
    "nol",
    "satu",
    "dua",
    "tiga",
    "empat",
    "lima",
    "enam",
    "tujuh",
    "delapan",
    "sembilan",
    "sepuluh",
    "sebelas",
];

function terbilang(value: number): string {
    const number = Math.floor(value);
    if (number < 12) return numberWords[number];
    if (number < 20) return `${terbilang(number - 10)} belas`;
    if (number < 100)
        return `${terbilang(Math.floor(number / 10))} puluh${number % 10 ? ` ${terbilang(number % 10)}` : ""}`;
    if (number < 200)
        return `seratus${number % 100 ? ` ${terbilang(number % 100)}` : ""}`;
    if (number < 1000)
        return `${terbilang(Math.floor(number / 100))} ratus${number % 100 ? ` ${terbilang(number % 100)}` : ""}`;
    if (number < 2000)
        return `seribu${number % 1000 ? ` ${terbilang(number % 1000)}` : ""}`;
    if (number < 1_000_000)
        return `${terbilang(Math.floor(number / 1000))} ribu${number % 1000 ? ` ${terbilang(number % 1000)}` : ""}`;
    if (number < 1_000_000_000)
        return `${terbilang(Math.floor(number / 1_000_000))} juta${number % 1_000_000 ? ` ${terbilang(number % 1_000_000)}` : ""}`;
    if (number < 1_000_000_000_000)
        return `${terbilang(Math.floor(number / 1_000_000_000))} miliar${number % 1_000_000_000 ? ` ${terbilang(number % 1_000_000_000)}` : ""}`;
    return `${terbilang(Math.floor(number / 1_000_000_000_000))} triliun${number % 1_000_000_000_000 ? ` ${terbilang(number % 1_000_000_000_000)}` : ""}`;
}

const currency = (value: string) =>
    new Intl.NumberFormat("id-ID", {
        // style: "currency",
        // currency: "IDR",
        maximumFractionDigits: 0,
    }).format(Number(value));

export function CashWidrawSlip({ deposit }: { deposit: CashDeposit }) {
    const amount = Number(deposit.amount);
    const slipCreatedAt = time(new Date().toISOString());

    const PINJAMAN: Record<number, string> = {
        20: "Umum",
        21: "Mingguan",
        22: "Pasaran",
        24: "PNS",
        25: "Perangkat",
        26: "KPR",
        27: "KUR",
        28: "Kelompok",
        29: "Motor Pegawai",
        30: "Motor Perangkat",
        31: "Kretamas",
        32: "Musiman",
        33: "Talangan Haji",
        34: "Dampak Musibah",
        35: "Maer Jah",
        36: "Kurda",
        37: "KKB",
        38: "Yarnen",
        39: "Berumroh",
    };

    return (
        <>
            <style>{`
                @page { size: auto; margin: 0; }
                * { box-sizing: border-box; }
                html, body { width: 21cm; height: 10cm; margin: 0; padding: 0; background: white; }
                body { font-family: Arial, sans-serif; }
                .cash-loan-slip { width: 100%; padding: 0.65cm 0.8cm; }
                .loan-slip-header { width: 100%; display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 0.25cm; margin-top: 2.37cm; }
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
                <div>
                    <div style={{ display: "flex" }}>
                        <div style={{ visibility: "hidden" }}>no. rekening</div>
                        <div style={{ paddingLeft: "1.5cm" }}>
                            {deposit.account_number}
                        </div>
                    </div>
                    <div style={{ display: "flex", marginTop: "10px" }}>
                        <div style={{ visibility: "hidden" }}>no. rekening</div>
                        <div style={{ paddingLeft: "1.5cm" }}>
                            {deposit.customer_name}
                        </div>
                    </div>
                    <div style={{ display: "flex", marginTop: "15px" }}>
                        <div style={{ visibility: "hidden" }}>
                            harap dibayarkan atas rekeningn diatas sejumlah
                        </div>
                        <div style={{ paddingLeft: "3.4cm" }}>
                            {currency(deposit.amount)}
                        </div>
                    </div>
                    <div style={{ display: "flex", marginTop: "7px" }}>
                        <div style={{ visibility: "hidden" }}>no. rekening</div>
                        <div style={{ paddingLeft: "1.5cm" }}>
                            {terbilang(amount)} rupiah
                        </div>
                    </div>
                </div>
            </main>
        </>
    );
}

export function printCashWidrawSlip(deposit: CashDeposit): void {
    const printWindow = window.open("", "_blank", "width=850,height=450");
    if (!printWindow) return;
    printWindow.document.write(
        '<!doctype html><html><head><title>Slip tarik tunai</title></head><body><div id="cash-widraw-slip-root"></div></body></html>',
    );
    printWindow.document.close();
    const root = createRoot(
        printWindow.document.getElementById("cash-widraw-slip-root")!,
    );
    root.render(<CashWidrawSlip deposit={deposit} />);
    printWindow.onafterprint = () => {
        root.unmount();
        printWindow.close();
    };
    printWindow.setTimeout(() => printWindow.print(), 100);
}
