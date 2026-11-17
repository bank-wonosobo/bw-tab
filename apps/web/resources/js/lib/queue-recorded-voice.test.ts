import { afterEach, expect, test, vi } from 'vite-plus/test';
import {
    QueueRecordedVoice,
    recordedCallClips,
    recordedVoiceURI,
} from './queue-recorded-voice';
import {
    QueueAnnouncementPlayer,
    defaultQueueVoiceOptions,
    loadQueueVoiceOptions,
} from './queue-voice';

afterEach(() => vi.unstubAllGlobals());

function recordingBrowser() {
    type Buffer = AudioBuffer & { clip: string };
    const sources: {
        buffer: Buffer | null;
        playbackRate: { value: number };
        onended: (() => void) | null;
        connect: ReturnType<typeof vi.fn>;
        disconnect: ReturnType<typeof vi.fn>;
        start: ReturnType<typeof vi.fn>;
        stop: ReturnType<typeof vi.fn>;
    }[] = [];
    const close = vi.fn(() => Promise.resolve());
    class AudioContext {
        currentTime = 0;
        state = 'running';
        destination = {};
        resume = vi.fn(() => Promise.resolve());
        close = close;

        decodeAudioData(bytes: ArrayBuffer) {
            return Promise.resolve({
                clip: new TextDecoder().decode(bytes),
                duration: 0.5,
            });
        }

        createBufferSource() {
            const source = {
                buffer: null as Buffer | null,
                playbackRate: { value: 1 },
                onended: null as (() => void) | null,
                connect: vi.fn(),
                disconnect: vi.fn(),
                start: vi.fn(),
                stop: vi.fn(),
            };
            sources.push(source);
            return source;
        }
    }
    const fetch = vi.fn(async (url: string) => ({
        ok: true,
        arrayBuffer: async () => new TextEncoder().encode(url).buffer,
    }));
    vi.stubGlobal('window', { AudioContext });
    vi.stubGlobal('fetch', fetch);
    return { sources, fetch, close };
}

test('uses the supplied recordings by default on a monitor without saved preferences', () => {
    vi.stubGlobal('localStorage', { getItem: () => null });

    expect(loadQueueVoiceOptions().voiceURI).toBe(recordedVoiceURI);
    expect(loadQueueVoiceOptions().rate).toBe(1);
});

test('assembles the supplied voice clips in order while preserving ticket zeros', () => {
    expect(
        recordedCallClips({
            ticket: { ticket_code: 'F-007' },
            counter: { name: 'Customer Service', code: '02' },
        }),
    ).toEqual([
        'nomor-antrean',
        'F',
        '0',
        '0',
        '7',
        'silahkan-menuju-loket',
        '2',
        'terima-kasih',
    ]);
    expect(
        recordedCallClips({
            ticket: { ticket_code: 'A001' },
            counter: { name: 'Loket 01' },
        }),
    ).toEqual([
        'nomor-antrean',
        'A',
        '0',
        '0',
        '1',
        'silahkan-menuju-loket',
        '1',
        'terima-kasih',
    ]);
});

test('requires speech fallback for a letter or destination that has no matching recording', () => {
    expect(
        recordedCallClips({
            ticket: { ticket_code: 'G001' },
            counter: { name: 'Loket 01' },
        }),
    ).toBeNull();
    expect(
        recordedCallClips({
            ticket: { ticket_code: 'A001' },
            counter: { name: 'Resepsionis' },
        }),
    ).toBeNull();
});

test('loads a clip once and schedules repeated digits without overlapping playback', async () => {
    const audio = recordingBrowser();
    const voice = new QueueRecordedVoice();
    voice.unlock();

    const playing = voice.play(['0', '0'], 1);
    await vi.waitFor(() => expect(audio.sources).toHaveLength(2));

    expect(audio.fetch).toHaveBeenCalledOnce();
    expect(audio.fetch).toHaveBeenCalledWith('/audio/antrian/0.mp3');
    expect(audio.sources[0].start).toHaveBeenCalledWith(0.03);
    expect(audio.sources[1].start).toHaveBeenCalledWith(0.53);
    audio.sources[0].onended?.();
    audio.sources[1].onended?.();
    await playing;

    const replay = voice.play(['0'], 1);
    await vi.waitFor(() => expect(audio.sources).toHaveLength(3));
    expect(audio.fetch).toHaveBeenCalledOnce();
    audio.sources[2].onended?.();
    await replay;
    voice.dispose();
    expect(audio.close).toHaveBeenCalledOnce();
});

test('cancels a recording before a pending download can start audio', async () => {
    const audio = recordingBrowser();
    let finishDownload!: (response: {
        ok: boolean;
        arrayBuffer: () => Promise<ArrayBuffer>;
    }) => void;
    vi.stubGlobal(
        'fetch',
        vi.fn(
            () =>
                new Promise((resolve) => {
                    finishDownload = resolve;
                }),
        ),
    );
    const voice = new QueueRecordedVoice();
    voice.unlock();
    const playing = voice.play(['0'], 1);
    await vi.waitFor(() => expect(finishDownload).toBeTypeOf('function'));

    voice.stop();
    finishDownload({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    await playing;

    expect(audio.sources).toHaveLength(0);
    voice.dispose();
});

test('plays recorded announcements in sequence without requiring device speech synthesis', async () => {
    const audio = recordingBrowser();
    const onError = vi.fn();
    const player = new QueueAnnouncementPlayer(onError, vi.fn());
    player.configure({ ...defaultQueueVoiceOptions, backsound: false });
    expect(player.activate()).toBe(true);
    await vi.waitFor(() => expect(audio.sources).toHaveLength(1));
    expect(audio.sources[0].buffer?.clip).toBe(
        '/audio/antrian/terima-kasih.mp3',
    );
    audio.sources[0].onended?.();
    await Promise.resolve();
    await Promise.resolve();

    player.announce({
        id: 'first',
        ticket: { ticket_code: 'A001' },
        counter: { name: 'Loket 01', code: '01' },
    });
    player.announce({
        id: 'recall',
        ticket: { ticket_code: 'A001' },
        counter: { name: 'Loket 01', code: '01' },
    });
    await vi.waitFor(() => expect(audio.sources).toHaveLength(9));
    expect(audio.sources.slice(1).map((source) => source.buffer?.clip)).toEqual(
        [
            '/audio/antrian/nomor-antrean.mp3',
            '/audio/antrian/A.mp3',
            '/audio/antrian/0.mp3',
            '/audio/antrian/0.mp3',
            '/audio/antrian/1.mp3',
            '/audio/antrian/silahkan-menuju-loket.mp3',
            '/audio/antrian/1.mp3',
            '/audio/antrian/terima-kasih.mp3',
        ],
    );

    for (const source of audio.sources.slice(1)) {
        source.onended?.();
    }
    await vi.waitFor(() => expect(audio.sources).toHaveLength(17));
    expect(onError).not.toHaveBeenCalled();
    expect(audio.fetch).toHaveBeenCalledTimes(19);
    player.stop();
    expect(
        audio.sources
            .slice(9)
            .every((source) => source.stop.mock.calls.length === 1),
    ).toBe(true);
    player.dispose();
});

test('reports a missing recording instead of silently completing an announcement', async () => {
    recordingBrowser();
    vi.stubGlobal(
        'fetch',
        vi.fn(async () => ({ ok: false })),
    );
    const voice = new QueueRecordedVoice();
    voice.unlock();

    await expect(voice.play(['nomor-antrean'], 1)).rejects.toThrow(
        'Rekaman nomor-antrean tidak dapat dimuat.',
    );
    voice.dispose();
});

test('falls back to device speech when the recording cannot be downloaded', async () => {
    const audio = recordingBrowser();
    audio.fetch.mockResolvedValue({
        ok: false,
        arrayBuffer: async () => new ArrayBuffer(0),
    });
    class Utterance {
        constructor(public text: string) {}
    }
    const speak = vi.fn<(utterance: SpeechSynthesisUtterance) => void>();
    Object.assign(window, {
        SpeechSynthesisUtterance: Utterance,
        speechSynthesis: {
            speak,
            getVoices: () => [],
            cancel: vi.fn(),
            paused: false,
        },
    });
    const onError = vi.fn();
    const onWarning = vi.fn();
    const player = new QueueAnnouncementPlayer(onError, onWarning);
    player.configure({ ...defaultQueueVoiceOptions, backsound: false });

    expect(player.activate()).toBe(true);
    await vi.waitFor(() => expect(speak).toHaveBeenCalledOnce());
    const activation = speak.mock.calls[0][0];
    activation.onend?.call(
        activation,
        new Event('end') as SpeechSynthesisEvent,
    );
    player.announce({
        id: 'first',
        ticket: { ticket_code: 'A001' },
        counter: { name: 'Loket 01' },
    });
    await vi.waitFor(() => expect(speak).toHaveBeenCalledTimes(2));

    expect(speak.mock.calls[1][0].text).toContain(
        'Nomor antrean A, nol, nol, satu.',
    );
    expect(onWarning).toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
    player.dispose();
});
