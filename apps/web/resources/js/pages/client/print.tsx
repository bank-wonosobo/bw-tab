import EscPosEncoder from 'esc-pos-encoder';

type SetoranReceipt = {
    nomorAntrian: string;
    namaNasabah: string;
    nomorRekening: string;
    jumlahSetoran: string;
    tanggal: string;
};

const PRINTER_WIDTH = 32;

function receiptLine(label: string, value: string) {
    const text = value || '-';
    const spaces = Math.max(1, PRINTER_WIDTH - label.length - text.length);

    return `${label}${' '.repeat(spaces)}${text}`;
}

function buildSetoranReceipt(data: SetoranReceipt) {
    return new EscPosEncoder()
        .initialize()
        .align('center')
        .bold(true)
        .line('BANK WONOSOBO')
        .bold(false)
        .line('SLIP SETORAN TUNAI')
        .line('--------------------------------')
        .bold(true)
        .width(2)
        .height(2)
        .line(data.nomorAntrian)
        .width(1)
        .height(1)
        .bold(false)
        .line('NOMOR ANTRIAN')
        .line('--------------------------------')
        .align('left')
        .line(`Tanggal      : ${data.tanggal}`)
        .line(`No. antrian  : ${data.nomorAntrian}`)
        .line(`Nasabah      : ${data.namaNasabah}`)
        .line(`No. rekening : ${data.nomorRekening}`)
        .line('--------------------------------')
        .line(receiptLine('JUMLAH SETORAN', data.jumlahSetoran))
        .line('--------------------------------')
        .align('center')
        .line('Terima kasih')
        .line('Simpan slip ini sebagai bukti')
        .newline()
        .newline()
        .newline()
        .cut()
        .encode();
}

function toBase64(bytes: Uint8Array) {
    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return window.btoa(binary);
}

function printToRawBT(data: SetoranReceipt) {
    if (!/Android/i.test(navigator.userAgent)) {
        throw new Error('Buka halaman ini dari browser Android yang terpasang RawBT.');
    }

    const bytes = buildSetoranReceipt(data);

    // Custom scheme ini menyerahkan data langsung ke RawBT tanpa preview.
    window.location.href = `rawbt:base64,${toBase64(bytes)}`;
}

const receipt: SetoranReceipt = {
    nomorAntrian: 'A-001',
    namaNasabah: 'Ahmad',
    nomorRekening: '1234567890',
    jumlahSetoran: 'Rp500.000',
    tanggal: new Intl.DateTimeFormat('id-ID').format(new Date()),
};

export function PrintButton() {
    const handlePrint = () => {
        try {
            printToRawBT(receipt);
        } catch (error) {
            alert(error instanceof Error ? error.message : 'Gagal membuka RawBT.');
        }
    };

    return (
        <button type="button" onClick={handlePrint}>
            Cetak ke RawBT
        </button>
    );
}

export default function SetoranPage() {
    return (
        <div className="p-4">
            <div className="no-print mb-4">
                <h1>Transaksi Setoran</h1>
                <PrintButton />
            </div>

            <div className="print-slip">
                <h2 className="text-center font-bold">BANK WONOSOBO</h2>
                <p className="text-center">SLIP SETORAN TABUNGAN</p>
                <hr />
                <p>No. Rekening: {receipt.nomorRekening}</p>
                <p>Nama Nasabah: {receipt.namaNasabah}</p>
                <p>Nominal: {receipt.jumlahSetoran}</p>
                <hr />
                <p className="text-right">Teller</p>
            </div>
        </div>
    );
}
