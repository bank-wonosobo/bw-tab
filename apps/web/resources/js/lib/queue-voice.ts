import { QueueCallSound } from './queue-sound';
import {
    QueueRecordedVoice,
    recordedCallClips,
    recordedVoiceURI,
} from './queue-recorded-voice';

export type QueueVoiceOptions = {
    voiceURI: string;
    rate: number;
    backsound: boolean;
    backsoundVolume: number;
};

export const defaultQueueVoiceOptions: QueueVoiceOptions = {
    voiceURI: recordedVoiceURI,
    rate: 1,
    backsound: true,
    backsoundVolume: 0.3,
};

export type QueueVoiceCall = {
    id: string;
    ticket: { ticket_code: string };
    counter: { name: string; code?: string };
};

const digitWords: Record<string, string> = {
    '0': 'nol',
    '1': 'satu',
    '2': 'dua',
    '3': 'tiga',
    '4': 'empat',
    '5': 'lima',
    '6': 'enam',
    '7': 'tujuh',
    '8': 'delapan',
    '9': 'sembilan',
};

export function queueCallText(call: QueueVoiceCall): string {
    const number = call.ticket.ticket_code
        .replace(/[\s-]/g, '')
        .split('')
        .map((character) => digitWords[character] ?? character.toUpperCase())
        .join(', ');
    const counter = call.counter.name.replace(/\d+/g, (digits) =>
        digits
            .split('')
            .map((digit) => digitWords[digit])
            .join(' '),
    );

    return `Nomor antrean ${number}. Silakan menuju ${counter}.`;
}

export class QueueCallTracker {
    private seen: Set<string>;

    constructor(
        private branchId: string,
        calls: readonly QueueVoiceCall[],
    ) {
        this.seen = new Set(calls.map((call) => call.id));
    }

    takeNew(
        branchId: string,
        calls: readonly QueueVoiceCall[],
    ): QueueVoiceCall[] {
        if (this.branchId !== branchId) {
            this.branchId = branchId;
            this.seen = new Set(calls.map((call) => call.id));

            return [];
        }

        const fresh = calls.filter((call) => !this.seen.has(call.id));
        for (const call of calls) {
            this.seen.add(call.id);
        }

        // The monitor receives newest first; announce in the order called.
        return fresh.reverse();
    }
}

export class QueueSpeech {
    private pending = new Set<SpeechSynthesisUtterance>();
    private options = defaultQueueVoiceOptions;

    constructor(private onError: (message: string) => void) {}

    configure(options: QueueVoiceOptions): void {
        this.options = options;
    }

    speak(text: string, onEnd?: () => void): boolean {
        if (
            typeof window === 'undefined' ||
            !window.speechSynthesis ||
            typeof window.SpeechSynthesisUtterance !== 'function'
        ) {
            this.onError(
                'Browser ini belum mendukung suara pemanggilan. Gunakan browser yang mendukung text-to-speech.',
            );

            return false;
        }

        try {
            const engine = window.speechSynthesis;
            const utterance = new window.SpeechSynthesisUtterance(text);
            // Voices can load after page load, so read the current list each time.
            const voices = engine.getVoices();
            const indonesianVoices = indonesianQueueVoices(voices);
            utterance.voice =
                indonesianVoices.find(
                    (voice) => voice.voiceURI === this.options.voiceURI,
                ) ??
                indonesianVoices[0] ??
                null;
            utterance.lang = 'id-ID';
            utterance.rate = this.options.rate;
            utterance.pitch = 1;
            utterance.volume = 1;
            utterance.onend = () => {
                this.pending.delete(utterance);
                onEnd?.();
            };
            utterance.onerror = (event) => {
                this.pending.delete(utterance);
                if (['canceled', 'interrupted'].includes(event.error)) {
                    onEnd?.();
                    return;
                }

                this.stop();
                this.onError(
                    event.error === 'not-allowed'
                        ? 'Suara diblokir browser. Tekan Aktifkan suara kembali untuk mengizinkan pemanggilan.'
                        : 'Suara tidak dapat diputar. Periksa speaker dan pengaturan text-to-speech bahasa Indonesia pada perangkat, lalu aktifkan suara kembali.',
                );
            };
            this.pending.add(utterance);
            if (engine.paused) {
                engine.resume();
            }
            engine.speak(utterance);

            return true;
        } catch {
            this.stop();
            this.onError(
                'Suara tidak dapat diputar. Periksa pengaturan audio perangkat, lalu aktifkan suara kembali.',
            );

            return false;
        }
    }

    stop(): void {
        const hasPending = this.pending.size > 0;
        for (const utterance of this.pending) {
            utterance.onend = null;
            utterance.onerror = null;
        }
        this.pending.clear();
        if (hasPending && typeof window !== 'undefined') {
            window.speechSynthesis?.cancel();
        }
    }
}
const voiceOptionsKey = 'bank-wonosobo.queue-voice.v2';

export function loadQueueVoiceOptions(): QueueVoiceOptions {
    try {
        const saved = JSON.parse(
            localStorage.getItem(voiceOptionsKey) ?? '{}',
        ) as Partial<QueueVoiceOptions> | null;

        return {
            voiceURI:
                typeof saved?.voiceURI === 'string'
                    ? saved.voiceURI
                    : defaultQueueVoiceOptions.voiceURI,
            rate:
                typeof saved?.rate === 'number' && Number.isFinite(saved.rate)
                    ? Math.min(1.1, Math.max(0.75, saved.rate))
                    : defaultQueueVoiceOptions.rate,
            backsound:
                typeof saved?.backsound === 'boolean' ? saved.backsound : true,
            backsoundVolume:
                typeof saved?.backsoundVolume === 'number' &&
                Number.isFinite(saved.backsoundVolume)
                    ? Math.min(0.5, Math.max(0, saved.backsoundVolume))
                    : defaultQueueVoiceOptions.backsoundVolume,
        };
    } catch {
        return { ...defaultQueueVoiceOptions };
    }
}

export function saveQueueVoiceOptions(options: QueueVoiceOptions): void {
    try {
        localStorage.setItem(voiceOptionsKey, JSON.stringify(options));
    } catch {
        // Audio controls still work when browser storage is unavailable.
    }
}

export function indonesianQueueVoices(
    voices: readonly SpeechSynthesisVoice[],
): SpeechSynthesisVoice[] {
    function score(voice: SpeechSynthesisVoice): number {
        return (
            (/natural|neural|premium|enhanced/i.test(voice.name) ? 100 : 0) +
            (/gadis/i.test(voice.name) ? 40 : 0) +
            (/google|microsoft/i.test(voice.name) ? 30 : 0) +
            (/damayanti/i.test(voice.name) ? 20 : 0) +
            (voice.localService ? 5 : 0)
        );
    }

    return voices
        .filter((voice) => /^id(?:[-_]|$)/i.test(voice.lang))
        .sort((a, b) => score(b) - score(a));
}

export class QueueAnnouncementPlayer {
    private speech: QueueSpeech;
    private sound: QueueCallSound;
    private recording = new QueueRecordedVoice();
    private queue: (QueueVoiceCall | string)[] = [];
    private busy = false;
    private generation = 0;
    private options = defaultQueueVoiceOptions;

    constructor(
        onError: (message: string) => void,
        private onWarning: (message: string) => void,
    ) {
        this.speech = new QueueSpeech((message) => {
            this.stop();
            onError(message);
        });
        this.sound = new QueueCallSound(onWarning);
    }

    configure(options: QueueVoiceOptions): void {
        this.options = options;
        this.speech.configure(options);
        if (!options.backsound || options.backsoundVolume === 0) {
            this.sound.stop();
        }
    }

    unlockAudio(): boolean {
        if (this.options.backsound && this.options.backsoundVolume > 0) {
            this.sound.unlock();
        }
        if (this.options.voiceURI === recordedVoiceURI) {
            try {
                this.recording.unlock();
                this.recording.preload();
            } catch {
                this.onWarning(
                    'Rekaman tidak didukung perangkat ini. Menggunakan suara perangkat sementara.',
                );
                return false;
            }
        }

        return true;
    }

    activate(): boolean {
        this.stop();
        const recordingReady = this.unlockAudio();
        this.busy = true;
        if (this.options.voiceURI === recordedVoiceURI && recordingReady) {
            const generation = this.generation;
            try {
                void this.recording
                    .play(['terima-kasih'], this.options.rate)
                    .then(() => {
                        if (generation === this.generation) {
                            this.busy = false;
                            void this.playNext();
                        }
                    })
                    .catch(() => {
                        if (generation === this.generation) {
                            this.onWarning(
                                'Rekaman belum dapat diputar. Menggunakan suara perangkat sementara.',
                            );
                            this.activateSpeech();
                        }
                    });
                return true;
            } catch {
                this.onWarning(
                    'Rekaman tidak didukung perangkat ini. Menggunakan suara perangkat sementara.',
                );
            }
        }

        return this.activateSpeech();
    }

    private activateSpeech(): boolean {
        const activated = this.speech.speak(
            'Suara pelayanan Bank Wonosobo siap digunakan.',
            () => {
                this.busy = false;
                void this.playNext();
            },
        );
        if (!activated) {
            this.busy = false;
        }

        return activated;
    }

    announce(call: QueueVoiceCall | string): void {
        this.queue.push(call);
        void this.playNext();
    }

    stop(): void {
        this.generation++;
        this.queue = [];
        this.busy = false;
        this.sound.stop();
        this.speech.stop();
        this.recording.stop();
    }

    dispose(): void {
        this.stop();
        this.sound.dispose();
        this.recording.dispose();
    }

    private async playNext(): Promise<void> {
        if (this.busy || !this.queue.length) {
            return;
        }
        const call = this.queue.shift()!;
        const text = typeof call === 'string' ? call : queueCallText(call);
        const generation = this.generation;
        this.busy = true;
        await this.sound.intro(
            this.options.backsound,
            this.options.backsoundVolume,
        );
        if (generation !== this.generation) {
            return;
        }
        this.sound.startBackground(
            this.options.backsound,
            this.options.backsoundVolume,
        );
        const finish = () => {
            if (generation !== this.generation) {
                return;
            }
            this.sound.finishBackground();
            this.busy = false;
            void this.playNext();
        };

        if (
            this.options.voiceURI === recordedVoiceURI &&
            typeof call !== 'string'
        ) {
            const clips = recordedCallClips(call);
            if (clips) {
                try {
                    await this.recording.play(clips, this.options.rate);
                    finish();
                    return;
                } catch {
                    if (generation !== this.generation) {
                        return;
                    }
                    this.onWarning(
                        'Rekaman panggilan tidak dapat diputar. Menggunakan suara perangkat sementara.',
                    );
                }
            } else {
                this.onWarning(
                    'Rekaman huruf atau nomor loket ini belum tersedia. Menggunakan suara perangkat.',
                );
            }
        }

        this.speech.speak(text, finish);
    }
}
