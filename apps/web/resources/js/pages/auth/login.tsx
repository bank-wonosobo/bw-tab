import { Head, Link, useForm } from '@inertiajs/react';
import { Feedback } from '@/components/queue-common';
export default function Login() {
    const form = useForm({ email: '', password: '' });
    return (
        <main className="flex min-h-screen items-center justify-center bg-slate-100 p-5">
            <Head title="Masuk petugas" />
            <div className="panel w-full max-w-md p-8!">
                <span className="flex size-12 items-center justify-center rounded-xl bg-primary font-bold text-white">
                    BW
                </span>
                <h1 className="mt-6 text-2xl font-bold">Masuk petugas</h1>
                <p className="mt-2 mb-6 text-sm text-slate-500">
                    Kelola antrean Bank Wonosobo.
                </p>
                <Feedback />
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        form.post('/login');
                    }}
                    className="space-y-4"
                >
                    <label className="block text-sm font-medium">
                        Email
                        <input
                            type="email"
                            autoComplete="username"
                            required
                            className="field mt-2"
                            value={form.data.email}
                            onChange={(e) =>
                                form.setData('email', e.target.value)
                            }
                        />
                    </label>
                    <label className="block text-sm font-medium">
                        Kata sandi
                        <input
                            type="password"
                            autoComplete="current-password"
                            required
                            className="field mt-2"
                            value={form.data.password}
                            onChange={(e) =>
                                form.setData('password', e.target.value)
                            }
                        />
                    </label>
                    <button
                        className="action w-full"
                        disabled={form.processing}
                    >
                        {form.processing ? 'Memeriksa…' : 'Masuk'}
                    </button>
                </form>
                <Link
                    href="/client"
                    className="mt-5 block text-center text-sm text-primary"
                >
                    ← Kembali ke layanan nasabah
                </Link>
            </div>
        </main>
    );
}
