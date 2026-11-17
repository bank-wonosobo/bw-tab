export const recordedVoiceURI = 'recorded:bank-wonosobo';

const recordings = new Set([
    'nomor-antrean',
    'silahkan-menuju-loket',
    'terima-kasih',
    ...'0123456789ABCDEF'.split(''),
]);

export function recordedCallClips(call: {
    ticket: { ticket_code: string };
    counter: { name: string; code?: string };
}): string[] | null {
    const ticket = call.ticket.ticket_code.replace(/[\s-]/g, '').toUpperCase();
    const counter = /^\d+$/.test(call.counter.code ?? '')
        ? call.counter.code!
        : call.counter.name.match(/\d+\s*$/)?.[0].trim();

    if (!/^[A-F0-9]+$/.test(ticket) || !counter) {
        return null;
    }

    return [
        'nomor-antrean',
        ...ticket.split(''),
        'silahkan-menuju-loket',
        ...counter.replace(/^0+(?=\d)/, '').split(''),
        'terima-kasih',
    ];
}

export class QueueRecordedVoice {
    private context: AudioContext | null = null;
    private ready: Promise<void> = Promise.resolve();
    private buffers = new Map<string, Promise<AudioBuffer>>();
    private sources = new Set<AudioBufferSourceNode>();
    private finish: (() => void) | null = null;
    private generation = 0;

    unlock(): void {
        if (typeof window === 'undefined' || !window.AudioContext) {
            throw new Error('Pemutaran rekaman tidak didukung perangkat ini.');
        }
        if (!this.context || this.context.state === 'closed') {
            this.context = new window.AudioContext();
            this.buffers.clear();
        }
        this.ready =
            this.context.state === 'suspended'
                ? this.context.resume()
                : Promise.resolve();
    }

    preload(): void {
        const generation = this.generation;
        void this.ready
            .then(() => {
                if (generation === this.generation) {
                    return Promise.all(
                        [...recordings].map((clip) => this.load(clip)),
                    );
                }
            })
            .catch(() => {
                // A requested clip reports its own loading error during playback.
            });
    }

    async play(clips: readonly string[], rate: number): Promise<void> {
        const generation = this.generation;
        await this.ready;
        if (generation !== this.generation) {
            return;
        }
        const context = this.context;
        if (!context || context.state !== 'running') {
            throw new Error('Audio rekaman belum diaktifkan.');
        }
        const buffers = await Promise.all(clips.map((clip) => this.load(clip)));
        if (generation !== this.generation || buffers.length === 0) {
            return;
        }

        return new Promise((resolve, reject) => {
            this.finish = resolve;
            let remaining = buffers.length;
            let start = context.currentTime + 0.03;
            try {
                for (const buffer of buffers) {
                    const source = context.createBufferSource();
                    source.buffer = buffer;
                    source.playbackRate.value = rate;
                    source.connect(context.destination);
                    this.sources.add(source);
                    source.onended = () => {
                        source.disconnect();
                        this.sources.delete(source);
                        remaining--;
                        if (remaining === 0) {
                            this.finish = null;
                            resolve();
                        }
                    };
                    source.start(start);
                    start += buffer.duration / rate;
                }
            } catch (error) {
                this.finish = null;
                this.stop();
                reject(error);
            }
        });
    }

    stop(): void {
        this.generation++;
        for (const source of this.sources) {
            source.onended = null;
            try {
                source.stop();
            } catch {
                // A source may fail before playback starts.
            }
            source.disconnect();
        }
        this.sources.clear();
        this.finish?.();
        this.finish = null;
    }

    dispose(): void {
        this.stop();
        if (this.context && this.context.state !== 'closed') {
            void this.context.close().catch(() => {});
        }
        this.context = null;
        this.buffers.clear();
    }

    private load(clip: string): Promise<AudioBuffer> {
        if (!recordings.has(clip)) {
            return Promise.reject(
                new Error('Potongan rekaman tidak tersedia.'),
            );
        }
        const existing = this.buffers.get(clip);
        if (existing) {
            return existing;
        }
        const context = this.context;
        if (!context) {
            return Promise.reject(new Error('Audio rekaman belum diaktifkan.'));
        }
        const buffer = fetch(`/audio/antrian/${clip}.mp3`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error(`Rekaman ${clip} tidak dapat dimuat.`);
                }
                return response.arrayBuffer();
            })
            .then((bytes) => context.decodeAudioData(bytes))
            .catch((error: unknown) => {
                this.buffers.delete(clip);
                throw error;
            });
        this.buffers.set(clip, buffer);

        return buffer;
    }
}
