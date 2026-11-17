import { afterEach, expect, test, vi } from 'vite-plus/test';
import {
    QueueAnnouncementPlayer,
    QueueCallTracker,
    QueueSpeech,
    defaultQueueVoiceOptions,
    loadQueueVoiceOptions,
    queueCallText,
    type QueueVoiceCall,
} from './queue-voice';

afterEach(() => vi.unstubAllGlobals());

function call(id: string, code = 'A001'): QueueVoiceCall {
    return {
        id,
        ticket: { ticket_code: code },
        counter: { name: 'Loket 01' },
    };
}

function speechBrowser() {
    class Utterance {
        constructor(public text: string) {}
    }
    const engine = {
        getVoices: vi.fn((): Partial<SpeechSynthesisVoice>[] => []),
        speak: vi.fn<(utterance: SpeechSynthesisUtterance) => void>(),
        cancel: vi.fn(),
        resume: vi.fn(),
        paused: false,
    };
    vi.stubGlobal('window', {
        speechSynthesis: engine,
        SpeechSynthesisUtterance: Utterance,
    });

    return engine;
}

test('reads every queue digit including leading zeros and the destination counter', () => {
    expect(queueCallText(call('first', 'A-001'))).toBe(
        'Nomor antrean A, nol, nol, satu. Silakan menuju Loket nol satu.',
    );
    expect(queueCallText(call('second', 'B290'))).toBe(
        'Nomor antrean B, dua, sembilan, nol. Silakan menuju Loket nol satu.',
    );
});

test('automatically prefers a natural Indonesian voice and honors the operator voice selection', () => {
    const engine = speechBrowser();
    const basic = {
        name: 'Indonesia',
        lang: 'id-ID',
        voiceURI: 'basic',
        localService: true,
    };
    const natural = {
        name: 'Microsoft Gadis Online (Natural)',
        lang: 'id-ID',
        voiceURI: 'natural',
        localService: false,
    };
    engine.getVoices.mockReturnValue([basic, natural]);
    const speech = new QueueSpeech(vi.fn());

    speech.speak('Panggilan otomatis.');
    speech.configure({
        ...defaultQueueVoiceOptions,
        voiceURI: 'basic',
        rate: 0.82,
    });
    speech.speak('Panggilan pilihan operator.');

    expect(engine.speak.mock.calls[0][0].voice).toBe(natural);
    expect(engine.speak.mock.calls[1][0].voice).toBe(basic);
    expect(engine.speak.mock.calls[1][0].rate).toBe(0.82);
});

test('restores monitor audio settings with safe bounds and survives unavailable storage', () => {
    vi.stubGlobal('localStorage', {
        getItem: () =>
            JSON.stringify({
                voiceURI: 'saved',
                rate: 20,
                backsound: false,
                backsoundVolume: -4,
            }),
    });

    expect(loadQueueVoiceOptions()).toEqual({
        voiceURI: 'saved',
        rate: 1.1,
        backsound: false,
        backsoundVolume: 0,
    });

    vi.stubGlobal('localStorage', {
        getItem: () => {
            throw new Error('blocked');
        },
    });

    expect(loadQueueVoiceOptions()).toEqual(defaultQueueVoiceOptions);
});

function audioBrowser() {
    const oscillators: {
        frequency: { value: number };
        type: string;
        onended: ((event: Event) => void) | null;
        connect: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
    }[] = [];
    const gains: {
        gain: {
            value: number;
            setValueAtTime: ReturnType<typeof vi.fn>;
            linearRampToValueAtTime: ReturnType<typeof vi.fn>;
            exponentialRampToValueAtTime: ReturnType<typeof vi.fn>;
            cancelScheduledValues: ReturnType<typeof vi.fn>;
        };
        connect: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
    }[] = [];

    class AudioContext {
        state = 'running';
        currentTime = 0;
        destination = {};
        resume = vi.fn(() => Promise.resolve());
        close = vi.fn(() => Promise.resolve());

        createOscillator() {
            const oscillator = {
                frequency: { value: 0 },
                type: '',
                onended: null as ((event: Event) => void) | null,
                connect: vi.fn(),
                disconnect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
            };
            oscillators.push(oscillator);
            return oscillator;
        }

        createGain() {
            const gain = {
                gain: {
                    value: 0,
                    setValueAtTime: vi.fn(),
                    linearRampToValueAtTime: vi.fn(),
                    exponentialRampToValueAtTime: vi.fn(),
                    cancelScheduledValues: vi.fn(),
                },
                connect: vi.fn(),
                disconnect: vi.fn(),
            };
            gains.push(gain);
            return gain;
        }
    }

    Object.assign(window, { AudioContext });
    return { oscillators, gains };
}

function finishSpeech(engine: ReturnType<typeof speechBrowser>, index: number) {
    const utterance = engine.speak.mock.calls[index][0];
    utterance.onend?.call(utterance, new Event('end') as SpeechSynthesisEvent);
}

function devicePlayer(onError = vi.fn(), onWarning = vi.fn()) {
    const player = new QueueAnnouncementPlayer(onError, onWarning);
    player.configure({ ...defaultQueueVoiceOptions, voiceURI: '' });
    return player;
}

test('plays a separate chime before each queued call and keeps background softer than the chime', async () => {
    const engine = speechBrowser();
    const audio = audioBrowser();
    const onError = vi.fn();
    const player = devicePlayer(onError);
    player.activate();
    finishSpeech(engine, 0);

    player.announce('Panggilan pertama.');
    player.announce('Panggilan kedua.');
    expect(engine.speak).toHaveBeenCalledTimes(1);
    audio.oscillators[1].onended?.(new Event('ended'));
    await Promise.resolve();

    expect(engine.speak.mock.calls[1][0].text).toBe('Panggilan pertama.');
    const chimeVolume = audio.gains[0].gain.exponentialRampToValueAtTime.mock
        .calls[0][0] as number;
    const backgroundVolume = audio.gains[2].gain.linearRampToValueAtTime.mock
        .calls[0][0] as number;
    expect(backgroundVolume).toBeGreaterThan(0);
    expect(backgroundVolume).toBeLessThan(chimeVolume / 4);

    finishSpeech(engine, 1);
    expect(engine.speak).toHaveBeenCalledTimes(2);
    audio.oscillators[6].onended?.(new Event('ended'));
    await Promise.resolve();

    expect(engine.speak.mock.calls[2][0].text).toBe('Panggilan kedua.');
    expect(onError).not.toHaveBeenCalled();
    player.dispose();
});

test('canceling during the chime prevents delayed speech and clears queued calls', async () => {
    const engine = speechBrowser();
    const audio = audioBrowser();
    const player = devicePlayer();
    player.activate();
    finishSpeech(engine, 0);
    player.announce('Panggilan pertama.');
    player.announce('Panggilan kedua.');

    player.stop();
    await Promise.resolve();

    expect(engine.speak).toHaveBeenCalledTimes(1);
    expect(
        audio.oscillators.every(
            (oscillator) => oscillator.disconnect.mock.calls.length > 0,
        ),
    ).toBe(true);
});

test.each([
    { backsound: false, backsoundVolume: 0.3 },
    { backsound: true, backsoundVolume: 0 },
])(
    'disabled or muted backsound leaves the announcement audible (%j)',
    async (options) => {
        const engine = speechBrowser();
        const audio = audioBrowser();
        const onWarning = vi.fn();
        const player = devicePlayer(vi.fn(), onWarning);
        player.configure({
            ...defaultQueueVoiceOptions,
            voiceURI: '',
            ...options,
        });
        player.activate();
        finishSpeech(engine, 0);

        player.announce('Nomor antrean A001.');
        await Promise.resolve();

        expect(engine.speak.mock.calls[1][0].text).toBe('Nomor antrean A001.');
        expect(audio.oscillators).toHaveLength(0);
        expect(onWarning).not.toHaveBeenCalled();
        player.dispose();
    },
);

test('speech failure stops the background and clears remaining announcements', async () => {
    const engine = speechBrowser();
    const audio = audioBrowser();
    const onError = vi.fn();
    const player = devicePlayer(onError);
    player.activate();
    finishSpeech(engine, 0);
    player.announce('Panggilan pertama.');
    player.announce('Panggilan kedua.');
    audio.oscillators[1].onended?.(new Event('ended'));
    await Promise.resolve();
    const utterance = engine.speak.mock.calls[1][0];

    utterance.onerror?.call(utterance, {
        error: 'audio-hardware',
    } as SpeechSynthesisErrorEvent);
    await Promise.resolve();

    expect(engine.speak).toHaveBeenCalledTimes(2);
    expect(
        audio.oscillators.every(
            (oscillator) => oscillator.disconnect.mock.calls.length > 0,
        ),
    ).toBe(true);
    expect(onError).toHaveBeenCalledOnce();
    player.dispose();
});

test.each([false, true])(
    'announcements still work without Web Audio (backsound enabled: %s)',
    async (backsound) => {
        const engine = speechBrowser();
        const onWarning = vi.fn();
        const player = devicePlayer(vi.fn(), onWarning);
        player.configure({
            ...defaultQueueVoiceOptions,
            voiceURI: '',
            backsound,
        });
        player.activate();
        finishSpeech(engine, 0);

        player.announce('Nomor antrean A001.');
        await Promise.resolve();

        expect(engine.speak.mock.calls[1][0].text).toBe('Nomor antrean A001.');
        if (backsound) {
            expect(onWarning).toHaveBeenCalledWith(
                'Perangkat ini tidak mendukung backsound. Pembacaan nomor antrean tetap aktif.',
            );
        } else {
            expect(onWarning).not.toHaveBeenCalled();
        }
        player.dispose();
    },
);

test('announces the first call when the monitor originally had no calls', () => {
    const tracker = new QueueCallTracker('pusat', []);

    expect(tracker.takeNew('pusat', [call('first')])).toEqual([call('first')]);
    expect(tracker.takeNew('pusat', [call('first')])).toEqual([]);
});

test('announces every new call in order and includes recalls of the same ticket', () => {
    const tracker = new QueueCallTracker('pusat', [call('initial')]);
    const recall = call('recall', 'A001');
    const second = call('second', 'B002');

    expect(tracker.takeNew('pusat', [recall, second, call('initial')])).toEqual(
        [second, recall],
    );
    expect(tracker.takeNew('pusat', [recall, second, call('initial')])).toEqual(
        [],
    );
});

test('does not replay existing history when opening the monitor or changing branch', () => {
    const tracker = new QueueCallTracker('pusat', [call('existing')]);

    expect(tracker.takeNew('pusat', [call('existing')])).toEqual([]);
    expect(tracker.takeNew('kaliwiro', [call('other-history')])).toEqual([]);
    expect(
        tracker.takeNew('kaliwiro', [call('new'), call('other-history')]),
    ).toEqual([call('new')]);
});

test('uses an Indonesian voice that becomes available after the initial activation', () => {
    const engine = speechBrowser();
    const onError = vi.fn();
    const speech = new QueueSpeech(onError);
    speech.speak('Suara pemanggilan antrean diaktifkan.');
    const indonesian = { lang: 'id-ID', localService: true };
    engine.getVoices.mockReturnValue([
        { lang: 'en-US', localService: true },
        indonesian,
    ]);

    speech.speak(queueCallText(call('first')));

    const utterance = engine.speak.mock.calls[1][0];
    expect(utterance.voice).toBe(indonesian);
    expect(utterance.lang).toBe('id-ID');
    expect(utterance.volume).toBe(1);
    expect(utterance.text).toBe(
        'Nomor antrean A, nol, nol, satu. Silakan menuju Loket nol satu.',
    );
    expect(engine.cancel).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
});

test('queues multiple announcements without cutting off the current announcement', () => {
    const engine = speechBrowser();
    const speech = new QueueSpeech(vi.fn());

    speech.speak(queueCallText(call('first', 'A001')));
    speech.speak(queueCallText(call('second', 'B002')));

    expect(engine.speak).toHaveBeenCalledTimes(2);
    expect(engine.speak.mock.calls[0][0].text).toContain('A, nol, nol, satu');
    expect(engine.speak.mock.calls[1][0].text).toContain('B, nol, nol, dua');
    expect(engine.cancel).not.toHaveBeenCalled();
});

test('stops pending audio and detaches callbacks when sound is disabled', () => {
    const engine = speechBrowser();
    const speech = new QueueSpeech(vi.fn());
    speech.speak('Panggilan pertama.');
    const utterance = engine.speak.mock.calls[0][0];

    speech.stop();

    expect(engine.cancel).toHaveBeenCalledOnce();
    expect(utterance.onerror).toBeNull();
    expect(utterance.onend).toBeNull();
});

test('reports blocked audio so the operator can activate speech again', () => {
    const engine = speechBrowser();
    const onError = vi.fn();
    const speech = new QueueSpeech(onError);
    speech.speak('Tes suara.');
    const utterance = engine.speak.mock.calls[0][0];

    utterance.onerror?.call(utterance, {
        error: 'not-allowed',
    } as SpeechSynthesisErrorEvent);

    expect(onError).toHaveBeenCalledWith(
        'Suara diblokir browser. Tekan Aktifkan suara kembali untuk mengizinkan pemanggilan.',
    );
});

test('reports browsers without speech synthesis instead of crashing the monitor', () => {
    vi.stubGlobal('window', {});
    const onError = vi.fn();

    expect(new QueueSpeech(onError).speak('Tes suara.')).toBe(false);
    expect(onError).toHaveBeenCalledWith(
        'Browser ini belum mendukung suara pemanggilan. Gunakan browser yang mendukung text-to-speech.',
    );
});
