export type User = {
    id: number;
    name: string;
    email: string;
    role_id?: string;
    branch_id?: string | null;
    counter_id?: string | null;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    [key: string]: unknown; // This allows for additional properties...
};

export type Auth = {
    user: User | null;
    permissions: string[];
};
