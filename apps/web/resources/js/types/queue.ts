export type Branch = {
    slug: string;
    bank_code?: string | null;
    id: string;
    code?: string;
    name: string;
    address?: string;
    is_active?: boolean;
};
export type Service = {
    transaction_type?:
        | 'tabungan'
        | 'deposito'
        | 'pinjaman'
        | 'tarik_tunai'
        | null;
    id: string;
    name: string;
    prefix: string;
    description?: string;
    estimated_duration: number;
};
export type Counter = {
    id: string;
    branch_id: string;
    name: string;
    is_active: boolean;
    services: Service[];
};
export type Ticket = {
    cash_deposit?: CashDeposit | null;
    id: string;
    ticket_code: string;
    status: string;
    issued_at: string;
    called_at: string | null;
    started_at: string | null;
    completed_at: string | null;
    service: Service;
    counter: Counter | null;
    session: { branch: Branch };
    calls: {
        id: string;
        call_number: number;
        called_at: string;
        counter: Counter;
        response_status: string;
    }[];
    events: {
        id: string;
        event_type: string;
        previous_status: string | null;
        new_status: string;
        created_at: string;
        actor?: { name: string } | null;
    }[];
};
export type CashDeposit = {
    transaction_type: string;
    bank_branch_code: string;
    account_number: string;
    account_reference: string;
    customer_name: string;
    customer_address: string | null;
    sender_name: string;
    sender_address: string | null;
    amount: string;
    notes: string | null;
    source_of_funds: string | null;
    transaction_purpose: string | null;
    verified_at: string;
};
export const statuses: Record<string, string> = {
    WAITING: 'Menunggu',
    CALLED: 'Dipanggil',
    SERVING: 'Dilayani',
    COMPLETED: 'Selesai',
    SKIPPED: 'Dilewati',
    NO_SHOW: 'Tidak hadir',
    CANCELLED: 'Dibatalkan',
};
export const time = (value?: string | null) =>
    value
        ? new Intl.DateTimeFormat('id-ID', {
              dateStyle: 'medium',
              timeStyle: 'short',
              timeZone: 'Asia/Jakarta',
          }).format(new Date(value))
        : '—';
