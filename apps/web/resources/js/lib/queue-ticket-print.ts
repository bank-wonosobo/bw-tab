import EscPosEncoder from 'esc-pos-encoder';
import { time } from '@/types/queue';

type QueueTicketReceipt = {
    ticketCode: string;
    serviceName: string;
    branchName: string;
    issuedAt: string;
};

// esc-pos-encoder 3 accepts options; its older type definitions omit them.
const ReceiptEncoder = EscPosEncoder as new (options: {
    columns: number;
}) => EscPosEncoder;

function queueTicketPrintUrl(ticket: QueueTicketReceipt): string {
    const bytes = new ReceiptEncoder({ columns: 32 })
        .initialize()
        .align('center')
        .bold(true)
        .line('BANK WONOSOBO')
        .bold(false)
        .line(ticket.branchName)
        .line('--------------------------------')
        .line('NOMOR ANTREAN')
        .bold(true)
        .width(2)
        .height(2)
        .line(ticket.ticketCode)
        .width(1)
        .height(1)
        .bold(false)
        .line(ticket.serviceName)
        .line('--------------------------------')
        .line(`${time(ticket.issuedAt)} WIB`)
        .line('Silakan menunggu panggilan')
        .line('sesuai nomor antrean Anda')
        .line('Terima kasih')
        .newline()
        .newline()
        .newline()
        .cut()
        .encode();

    let binary = '';

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return `rawbt:base64,${btoa(binary)}`;
}

export function printQueueTicket(ticket: QueueTicketReceipt): void {
    if (!/Android/i.test(navigator.userAgent)) {
        throw new Error(
            'Cetak tiket tersedia di tablet Android dengan aplikasi RawBT dan printer yang sudah terhubung.',
        );
    }

    window.location.assign(queueTicketPrintUrl(ticket));
}
