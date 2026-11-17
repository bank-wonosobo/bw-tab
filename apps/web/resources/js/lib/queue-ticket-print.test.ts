import { afterEach, expect, test, vi } from 'vite-plus/test';
import { printQueueTicket } from './queue-ticket-print';

afterEach(() => vi.unstubAllGlobals());

test('sends the actual queue ticket to RawBT without opening browser print', () => {
    const assign = vi.fn();
    const print = vi.fn();
    vi.stubGlobal('navigator', {
        userAgent: 'Mozilla/5.0 (Linux; Android 14)',
    });
    vi.stubGlobal('window', { location: { assign }, print });

    printQueueTicket({
        ticketCode: 'T-027',
        serviceName: 'Setor Tabungan',
        branchName: 'Kantor Pusat',
        issuedAt: '2026-11-11T18:05:00.000000Z',
    });

    expect(assign).toHaveBeenCalledOnce();
    const url = assign.mock.calls[0][0] as string;
    expect(url).toMatch(/^rawbt:base64,[A-Za-z0-9+/]+=*$/);
    const receipt = atob(url.slice('rawbt:base64,'.length));
    expect(receipt).toContain('BANK WONOSOBO');
    expect(receipt).toContain('Kantor Pusat');
    expect(receipt).toContain('T-027');
    expect(receipt).toContain('Setor Tabungan');
    expect(receipt).toContain('12 Nov 2026, 01.05 WIB');
    expect(print).not.toHaveBeenCalled();
});

test('explains the Android requirement without launching browser print on desktop', () => {
    const assign = vi.fn();
    const print = vi.fn();
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh)' });
    vi.stubGlobal('window', { location: { assign }, print });

    expect(() =>
        printQueueTicket({
            ticketCode: 'C-008',
            serviceName: 'Customer Service',
            branchName: 'Cabang Kaliwiro',
            issuedAt: '2026-11-12T02:00:00.000000Z',
        }),
    ).toThrow('tablet Android');
    expect(assign).not.toHaveBeenCalled();
    expect(print).not.toHaveBeenCalled();
});
