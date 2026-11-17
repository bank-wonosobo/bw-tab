export class QueueCallSound {
    private context: AudioContext | null = null;
    private nodes = new Map<OscillatorNode, GainNode>();
    private background = new Set<OscillatorNode>();
    private finishIntro: (() => void) | null = null;

    constructor(private onWarning: (message: string) => void) {}

    unlock(): void {
        try {
            if (!window.AudioContext) {
                this.onWarning(
                    'Perangkat ini tidak mendukung backsound. Pembacaan nomor antrean tetap aktif.',
                );
                return;
            }
            if (!this.context || this.context.state === 'closed') {
                this.context = new window.AudioContext();
            }
            if (this.context.state === 'suspended') {
                void this.context.resume().catch(() => {
                    this.onWarning(
                        'Backsound belum dapat diputar. Aktifkan suara kembali untuk mengizinkan audio.',
                    );
                });
            }
        } catch {
            this.onWarning(
                'Backsound tidak tersedia. Pembacaan nomor antrean tetap aktif.',
            );
        }
    }

    intro(enabled: boolean, volume: number): Promise<void> {
        const context = this.context;
        if (
            !enabled ||
            volume <= 0 ||
            !context ||
            context.state !== 'running'
        ) {
            return Promise.resolve();
        }

        return new Promise((resolve) => {
            this.finishIntro = resolve;
            try {
                const start = context.currentTime + 0.03;
                this.tone(659.25, start, 0.85, volume * 0.45);
                const last = this.tone(523.25, start + 0.36, 1, volume * 0.4);
                const cleanup = last.onended;
                last.onended = (event) => {
                    cleanup?.call(last, event);
                    this.finishIntro = null;
                    resolve();
                };
            } catch {
                this.stop();
                this.onWarning(
                    'Nada pembuka tidak dapat diputar. Pembacaan nomor antrean tetap aktif.',
                );
                resolve();
            }
        });
    }

    startBackground(enabled: boolean, volume: number): void {
        const context = this.context;
        if (
            !enabled ||
            volume <= 0 ||
            !context ||
            context.state !== 'running'
        ) {
            return;
        }

        try {
            for (const frequency of [261.63, 329.63, 392]) {
                const oscillator = context.createOscillator();
                const gain = context.createGain();
                oscillator.type = 'sine';
                oscillator.frequency.value = frequency;
                gain.gain.setValueAtTime(0, context.currentTime);
                gain.gain.linearRampToValueAtTime(
                    volume * 0.035,
                    context.currentTime + 0.6,
                );
                this.connect(oscillator, gain);
                this.background.add(oscillator);
                oscillator.start();
            }
        } catch {
            this.finishBackground();
        }
    }

    finishBackground(): void {
        const context = this.context;
        if (!context) {
            return;
        }
        for (const oscillator of this.background) {
            const gain = this.nodes.get(oscillator);
            gain?.gain.cancelScheduledValues(context.currentTime);
            gain?.gain.setValueAtTime(gain.gain.value, context.currentTime);
            gain?.gain.linearRampToValueAtTime(0, context.currentTime + 0.2);
            oscillator.stop(context.currentTime + 0.22);
        }
        this.background.clear();
    }

    stop(): void {
        this.finishIntro?.();
        this.finishIntro = null;
        for (const [oscillator, gain] of this.nodes) {
            oscillator.onended = null;
            try {
                oscillator.stop();
            } catch {
                // An audio source may fail before it starts.
            }
            oscillator.disconnect();
            gain.disconnect();
        }
        this.nodes.clear();
        this.background.clear();
    }

    dispose(): void {
        this.stop();
        if (this.context && this.context.state !== 'closed') {
            void this.context.close().catch(() => {});
        }
        this.context = null;
    }

    private tone(
        frequency: number,
        start: number,
        duration: number,
        volume: number,
    ): OscillatorNode {
        const context = this.context!;
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(
            Math.max(0.0001, volume),
            start + 0.012,
        );
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        this.connect(oscillator, gain);
        oscillator.start(start);
        oscillator.stop(start + duration);

        return oscillator;
    }

    private connect(oscillator: OscillatorNode, gain: GainNode): void {
        oscillator.connect(gain);
        gain.connect(this.context!.destination);
        this.nodes.set(oscillator, gain);
        oscillator.onended = () => {
            oscillator.disconnect();
            gain.disconnect();
            this.nodes.delete(oscillator);
            this.background.delete(oscillator);
        };
    }
}
