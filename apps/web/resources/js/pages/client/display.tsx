import { recordedVoiceURI } from "@/lib/queue-recorded-voice";
import {
    QueueAnnouncementPlayer,
    QueueCallTracker,
    indonesianQueueVoices,
    loadQueueVoiceOptions,
    saveQueueVoiceOptions,
    type QueueVoiceOptions,
} from "@/lib/queue-voice";
import type { Branch } from "@/types/queue";
import { Head, router, usePoll } from "@inertiajs/react";
import { useEffect, useState } from "react";
type Call = {
    id: string;
    called_at: string;
    ticket: { ticket_code: string; status: string };
    counter: { name: string; code?: string };
};
type Props = {
    branches: Branch[];
    branchId: string;
    calls: Call[];
    counters: {
        id: string;
        name: string;
        is_active: boolean;
        services: { id: string; name: string }[];
        current: {
            ticket_code: string;
            status: "CALLED" | "SERVING";
            service: { name: string };
        } | null;
    }[];
    settings: {
        title: string;
        message: string;
        poll_seconds: number;
        sound: boolean;
        video_url: string | null;
    };
};

function AdvertisementVideo({ url }: { url: string | null }) {
    const [failed, setFailed] = useState(false);

    return (
        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-black">
            {url && !failed ? (
                <video
                    aria-label="Video iklan Bank Wonosobo"
                    className="h-full w-full object-contain"
                    src={url}
                    autoPlay
                    loop
                    muted
                    playsInline
                    controls
                    preload="metadata"
                    onError={() => setFailed(true)}
                >
                    Perangkat ini tidak mendukung pemutaran video.
                </video>
            ) : (
                <div role="status" className="p-6 text-center">
                    <p className="text-lg font-semibold text-slate-200">
                        BANK WONOSOBO
                    </p>
                    <p className="mt-2 text-sm text-slate-400">
                        {failed
                            ? "Video iklan tidak dapat diputar."
                            : "Video iklan belum tersedia."}
                    </p>
                </div>
            )}
        </div>
    );
}

export default function Display({
    branches,
    branchId,
    calls,
    counters,
    settings,
}: Props) {
    usePoll(settings.poll_seconds * 1000, {
        only: ["calls", "counters", "settings"],
    });
    const [sound, setSound] = useState(false);
    const [soundError, setSoundError] = useState<string | null>(null);
    const [soundNotice, setSoundNotice] = useState<string | null>(null);
    const [voiceOptions, setVoiceOptions] = useState(loadQueueVoiceOptions);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const [callTracker] = useState(() => new QueueCallTracker(branchId, calls));
    const [player] = useState(
        () =>
            new QueueAnnouncementPlayer((message) => {
                setSoundError(message);
                setSound(false);
            }, setSoundNotice),
    );

    useEffect(() => {
        player.configure(voiceOptions);
    }, [player, voiceOptions]);
    useEffect(() => {
        const engine = window.speechSynthesis;
        if (!engine) {
            return;
        }
        const refreshVoices = () =>
            setVoices(indonesianQueueVoices(engine.getVoices()));
        refreshVoices();
        engine.addEventListener("voiceschanged", refreshVoices);

        return () => engine.removeEventListener("voiceschanged", refreshVoices);
    }, []);
    useEffect(() => {
        const newCalls = callTracker.takeNew(branchId, calls);
        if (!sound || !settings.sound) {
            player.stop();
            return;
        }

        for (const call of newCalls) {
            player.announce(call);
        }
    }, [branchId, calls, callTracker, sound, settings.sound, player]);
    useEffect(() => () => player.stop(), [branchId, player]);
    useEffect(() => () => player.dispose(), [player]);

    function updateVoiceOptions(changes: Partial<QueueVoiceOptions>) {
        const next = { ...voiceOptions, ...changes };
        setVoiceOptions(next);
        player.configure(next);
        saveQueueVoiceOptions(next);
        if (sound) {
            player.unlockAudio();
        }
    }

    function toggleSound() {
        setSoundError(null);
        setSoundNotice(null);
        if (sound) {
            player.stop();
            setSound(false);
            return;
        }

        // Speak inside the click handler to activate audio on tablet browsers.
        setSound(player.activate());
    }

    const latest = calls[0];
    return (
        <main className="min-h-screen bg-slate-950 px-5 py-7 text-white sm:px-10">
            <Head title="Monitor antrean" />
            <header className="mb-10 flex flex-wrap items-center justify-between gap-4">
                <div>
                    <p className="text-sm font-semibold tracking-widest text-blue-300">
                        {settings.title}
                    </p>
                    <h1 className="mt-2 text-2xl font-bold">Monitor antrean</h1>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        aria-label="Cabang monitor"
                        className="rounded-xl bg-slate-800 p-3"
                        value={branchId ?? ""}
                        onChange={(e) =>
                            router.get("/display", {
                                branch_id: e.target.value,
                            })
                        }
                    >
                        {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                                {b.name}
                            </option>
                        ))}
                    </select>
                    <button
                        type="button"
                        className="rounded-xl bg-slate-800 px-4 py-2 text-sm disabled:opacity-50"
                        aria-pressed={sound && settings.sound}
                        disabled={!settings.sound}
                        onClick={toggleSound}
                    >
                        {!settings.sound
                            ? "Suara dinonaktifkan admin"
                            : sound
                              ? "Suara aktif · Matikan"
                              : "Aktifkan suara"}
                    </button>
                    <button
                        type="button"
                        className="rounded-xl bg-slate-800 px-4 py-2 text-sm disabled:opacity-50"
                        disabled={!sound || !settings.sound}
                        onClick={() => {
                            setSoundError(null);
                            player.announce({
                                id: "test",
                                ticket: { ticket_code: "A001" },
                                counter: { name: "Loket 01" },
                            });
                        }}
                    >
                        Tes suara
                    </button>
                    <button
                        className="rounded-xl bg-slate-800 px-4 py-2 text-sm"
                        onClick={() => {
                            if (document.fullscreenElement)
                                void document.exitFullscreen();
                            else
                                void document.documentElement.requestFullscreen();
                        }}
                    >
                        Layar penuh
                    </button>
                </div>
            </header>
            <details className="mb-6 rounded-2xl border border-slate-800 bg-slate-900 p-4">
                <summary className="cursor-pointer text-sm font-semibold">
                    Pengaturan suara &amp; backsound
                </summary>
                <div className="mt-4 grid gap-5 md:grid-cols-3">
                    <label className="text-sm">
                        Pengisi suara Indonesia
                        <select
                            className="mt-2 w-full rounded-xl bg-slate-800 p-3"
                            value={
                                voiceOptions.voiceURI === recordedVoiceURI ||
                                voices.some(
                                    (voice) =>
                                        voice.voiceURI ===
                                        voiceOptions.voiceURI,
                                )
                                    ? voiceOptions.voiceURI
                                    : ""
                            }
                            onChange={(event) =>
                                updateVoiceOptions({
                                    voiceURI: event.target.value,
                                })
                            }
                        >
                            <option value={recordedVoiceURI}>
                                Rekaman Bank Wonosobo
                            </option>
                            <option value="">Suara otomatis perangkat</option>
                            {voices.map((voice) => (
                                <option
                                    key={voice.voiceURI}
                                    value={voice.voiceURI}
                                >
                                    {voice.name}
                                </option>
                            ))}
                        </select>
                        <span className="mt-2 block text-xs leading-5 text-slate-400">
                            {voiceOptions.voiceURI === recordedVoiceURI
                                ? "Menggunakan rekaman voice-over yang sama pada setiap monitor."
                                : `Suara otomatis: ${voices[0]?.name ?? "suara Indonesia bawaan perangkat"}.`}{" "}
                            Pilihan disimpan pada perangkat monitor ini.
                        </span>
                    </label>
                    <label className="text-sm">
                        Kecepatan baca · {voiceOptions.rate.toFixed(2)}×
                        <input
                            type="range"
                            min={0.75}
                            max={1.1}
                            step={0.01}
                            className="mt-4 w-full accent-blue-400"
                            value={voiceOptions.rate}
                            onChange={(event) =>
                                updateVoiceOptions({
                                    rate: Number(event.target.value),
                                })
                            }
                        />
                        <span className="mt-2 block text-xs text-slate-400">
                            Rekaman menggunakan kecepatan asli secara default
                            (1×).
                        </span>
                    </label>
                    <div className="space-y-3 text-sm">
                        <label className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                checked={voiceOptions.backsound}
                                onChange={(event) =>
                                    updateVoiceOptions({
                                        backsound: event.target.checked,
                                    })
                                }
                            />
                            Nada pembuka &amp; backsound lembut
                        </label>
                        <label className="block">
                            Volume backsound ·{" "}
                            {Math.round(voiceOptions.backsoundVolume * 100)}%
                            <input
                                type="range"
                                min={0}
                                max={0.5}
                                step={0.01}
                                className="mt-3 w-full accent-blue-400 disabled:opacity-50"
                                disabled={!voiceOptions.backsound}
                                value={voiceOptions.backsoundVolume}
                                onChange={(event) =>
                                    updateVoiceOptions({
                                        backsoundVolume: Number(
                                            event.target.value,
                                        ),
                                    })
                                }
                            />
                        </label>
                        <p className="text-xs leading-5 text-slate-400">
                            Nada ding-dong mendahului nomor antrean. Latar suara
                            diputar pelan selama pemanggilan.
                        </p>
                    </div>
                </div>
            </details>
            {soundNotice && !soundError && (
                <p role="status" className="mb-6 text-sm text-amber-200">
                    {soundNotice}
                </p>
            )}
            {soundError ? (
                <p
                    role="alert"
                    className="mb-6 rounded-xl border border-amber-800 bg-amber-950 p-4 text-sm text-amber-200"
                >
                    {soundError}
                </p>
            ) : settings.sound && !sound ? (
                <p className="mb-6 text-sm text-slate-400">
                    Tekan Aktifkan suara sekali untuk membacakan nomor antrean
                    dan loket secara otomatis saat ada panggilan baru.
                </p>
            ) : null}
            <section aria-labelledby="counters-heading" className="mb-7">
                <h2
                    id="counters-heading"
                    className="mb-4 text-lg font-semibold"
                >
                    Antrean setiap loket
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {counters.map((counter) => (
                        <article
                            key={counter.id}
                            className={`rounded-2xl border p-5 text-center ${
                                !counter.is_active
                                    ? "border-slate-800 bg-slate-900 text-slate-400"
                                    : counter.current
                                      ? "border-blue-500 bg-blue-950"
                                      : "border-slate-700 bg-slate-900"
                            }`}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="text-xl font-bold">
                                    {counter.name}
                                </h3>
                                <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                                    {!counter.is_active
                                        ? "Tutup"
                                        : counter.current?.status === "CALLED"
                                          ? "Dipanggil"
                                          : counter.current?.status ===
                                              "SERVING"
                                            ? "Dilayani"
                                            : "Tersedia"}
                                </span>
                            </div>
                            <p className="my-5 text-5xl font-bold tracking-tight">
                                {counter.current?.ticket_code ?? "—"}
                            </p>
                            <p className="text-sm text-slate-300">
                                {counter.current?.service.name ??
                                    counter.services
                                        .map((service) => service.name)
                                        .join(" · ")}
                            </p>
                            {!counter.current && counter.is_active && (
                                <p className="mt-2 text-xs text-slate-400">
                                    Belum ada antrean dipanggil
                                </p>
                            )}
                        </article>
                    ))}
                </div>
                {counters.length === 0 && (
                    <p className="rounded-2xl bg-slate-900 p-6 text-slate-400">
                        Belum ada loket di cabang ini.
                    </p>
                )}
            </section>
            <div className="grid items-stretch gap-7 lg:grid-cols-[1fr_1.6fr]">
                <section className="rounded-3xl bg-primary px-7 py-14 text-center">
                    <p className="text-lg text-blue-100">
                        Nomor terakhir dipanggil
                    </p>
                    <p className="my-10 text-8xl font-bold tracking-tight sm:text-9xl">
                        {latest?.ticket.ticket_code ?? "—"}
                    </p>
                    <p className="text-3xl font-semibold">
                        {latest?.counter.name ?? "Menunggu pemanggilan"}
                    </p>
                </section>
                <section
                    aria-labelledby="advertisement-heading"
                    className="min-w-0"
                >
                    <h2
                        id="advertisement-heading"
                        className="mb-4 text-lg font-semibold"
                    >
                        Video iklan
                    </h2>
                    <AdvertisementVideo
                        key={settings.video_url}
                        url={settings.video_url}
                    />
                </section>
            </div>
            <footer className="mt-10 rounded-2xl border border-slate-800 p-5 text-center text-lg text-slate-300">
                {settings.message}
            </footer>
        </main>
    );
}
