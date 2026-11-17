import { afterEach, expect, test, vi } from 'vite-plus/test';
import { createRequestId } from './request-id';

afterEach(() => vi.unstubAllGlobals());

test('uses native UUID generation when available', () => {
    const randomUUID = vi.fn(() => 'd0a42124-bd64-4d55-b718-a2ffefff1c25');
    const getRandomValues = vi.fn();
    vi.stubGlobal('crypto', { randomUUID, getRandomValues });

    expect(createRequestId()).toBe('d0a42124-bd64-4d55-b718-a2ffefff1c25');
    expect(randomUUID).toHaveBeenCalledOnce();
    expect(getRandomValues).not.toHaveBeenCalled();
});

test.each([
    [0, '00000000-0000-4000-8000-000000000000'],
    [255, 'ffffffff-ffff-4fff-bfff-ffffffffffff'],
])(
    'generates a valid UUID without randomUUID on an HTTP origin (bytes %i)',
    (byte, expected) => {
        const getRandomValues = vi.fn((bytes: Uint8Array) => bytes.fill(byte));
        vi.stubGlobal('crypto', { getRandomValues });

        expect(createRequestId()).toBe(expected);
        expect(getRandomValues).toHaveBeenCalledOnce();
        expect(getRandomValues.mock.calls[0][0]).toHaveLength(16);
    },
);
