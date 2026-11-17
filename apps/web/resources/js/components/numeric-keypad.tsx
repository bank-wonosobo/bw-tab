'use client';

import { ArrowLeft02Icon, Check } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type NumericKeypadProps = {
    onClose?: () => void;
    variant?: 'floating' | 'inline';
    value?: string;
    onValueChange?: (value: string) => void;
    onConfirm?: () => void;
    label?: string;
    confirmLabel?: string;
    disabled?: boolean;
    confirmDisabled?: boolean;
    maxLength?: number;
};

export function NumericKeypad(props: NumericKeypadProps) {
    if (props.variant === 'inline') {
        return <InlineNumericKeypad {...props} />;
    }

    return <FloatingNumericKeypad onClose={props.onClose} />;
}

function InlineNumericKeypad({
    value = '',
    onValueChange,
    onConfirm,
    label = 'Keyboard angka',
    confirmLabel = 'Selesai',
    disabled = false,
    confirmDisabled = false,
    maxLength = 30,
}: NumericKeypadProps) {
    const keyClass =
        'flex h-16 touch-manipulation select-none items-center justify-center rounded-2xl border border-slate-200 bg-white text-2xl font-semibold text-slate-800 shadow-sm transition active:scale-95 active:border-primary active:bg-blue-50 disabled:opacity-40 lg:h-[72px]';
    return (
        <section
            aria-label="Keyboard angka"
            className="rounded-3xl border border-slate-200 bg-slate-100 p-4 sm:p-5"
        >
            <div className="mb-4">
                <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">
                    KEYBOARD ANGKA
                </p>
                <h2 className="mt-1 text-lg font-bold text-slate-900">
                    {label}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                    Ketuk isian di sebelah kiri untuk berpindah.
                </p>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
                {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((number) => (
                    <button
                        key={number}
                        type="button"
                        disabled={disabled}
                        className={keyClass}
                        onPointerDown={(event) => event.preventDefault()}
                        onClick={() =>
                            onValueChange?.(
                                (value + number).slice(0, maxLength),
                            )
                        }
                    >
                        {number}
                    </button>
                ))}
                <button
                    type="button"
                    disabled={disabled}
                    className={`${keyClass} text-sm! text-red-600!`}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onValueChange?.('')}
                >
                    Hapus semua
                </button>
                <button
                    type="button"
                    disabled={disabled}
                    className={keyClass}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() =>
                        onValueChange?.((value + '0').slice(0, maxLength))
                    }
                >
                    0
                </button>
                <button
                    type="button"
                    aria-label="Hapus satu angka"
                    disabled={disabled}
                    className={keyClass}
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() => onValueChange?.(value.slice(0, -1))}
                >
                    <HugeiconsIcon icon={ArrowLeft02Icon} size={25} />
                </button>
            </div>
            <button
                type="button"
                disabled={disabled || confirmDisabled}
                className="action mt-3 min-h-14! w-full rounded-2xl! text-base!"
                onPointerDown={(event) => event.preventDefault()}
                onClick={onConfirm}
            >
                {confirmLabel}
            </button>
        </section>
    );
}

function FloatingNumericKeypad({ onClose }: NumericKeypadProps) {
    const [target, setTarget] = useState<HTMLInputElement | null>(null);
    const originalInputMode = useRef<string | null>(null);

    useEffect(() => {
        const handleFocusIn = (event: FocusEvent) => {
            const input = event.target;

            if (input instanceof HTMLInputElement && input.type === 'text') {
                setTarget(input);

                if (originalInputMode.current === null) {
                    originalInputMode.current = input.getAttribute('inputmode');
                }

                input.setAttribute('inputmode', 'none');
            } else {
                setTarget(null);
            }
        };

        const handleFocusOut = (event: FocusEvent) => {
            const input = event.target;

            if (
                input instanceof HTMLInputElement &&
                input.hasAttribute('data-numeric-keypad')
            ) {
                const previousMode = originalInputMode.current;

                if (previousMode === null) {
                    input.removeAttribute('inputmode');
                } else {
                    input.setAttribute('inputmode', previousMode);
                }

                originalInputMode.current = null;
            }
        };

        document.addEventListener('focusin', handleFocusIn);
        document.addEventListener('focusout', handleFocusOut);

        return () => {
            document.removeEventListener('focusin', handleFocusIn);
            document.removeEventListener('focusout', handleFocusOut);
        };
    }, []);

    const updateValue = (value: string) => {
        if (!target) return;

        const descriptor = Object.getOwnPropertyDescriptor(
            HTMLInputElement.prototype,
            'value',
        );

        descriptor?.set?.call(target, value);
        target.dispatchEvent(new Event('input', { bubbles: true }));
    };

    const insertNumber = (number: string) => {
        if (!target) return;

        const currentValue = target.value;
        const nextValue = currentValue + number;

        if (nextValue !== '' && !Number.isFinite(Number(nextValue))) return;

        updateValue(nextValue);
        target.focus();
    };

    const removeLast = () => {
        if (!target) return;

        updateValue(target.value.slice(0, -1));
        target.focus();
    };

    const clear = () => {
        updateValue('');
        target?.focus();
    };

    const handleEnter = () => {
        target?.blur();
        setTarget(null);
        onClose?.();
    };

    if (!target || typeof document === 'undefined') return null;

    return createPortal(
        <div
            className="fixed top-0 right-0 z-[100] flex h-full w-md items-center border-t bg-background p-3 shadow-2xl"
            onPointerDown={(event) => event.preventDefault()}
        >
            <div className="mx-auto grid w-full max-w-md grid-cols-3 gap-2">
                {[
                    '1',
                    '2',
                    '3',
                    '4',
                    '5',
                    '6',
                    '7',
                    '8',
                    '9',
                    '-',
                    '0',
                    '.',
                ].map((number) => (
                    <button
                        key={number}
                        type="button"
                        onClick={() => insertNumber(number)}
                        className="flex h-14 items-center justify-center rounded-lg border bg-card text-xl font-semibold active:-translate-y-1 active:border-primary active:text-primary active:shadow-lg"
                    >
                        {number}
                    </button>
                ))}

                <button
                    type="button"
                    onClick={removeLast}
                    className="flex h-14 items-center justify-center rounded-lg border bg-card active:-translate-y-1 active:bg-accent"
                >
                    <HugeiconsIcon icon={ArrowLeft02Icon} />
                    {/* <Backspace className="size-6" /> */}
                </button>

                <button
                    type="button"
                    onClick={clear}
                    className="flex h-14 items-center justify-center rounded-lg border bg-card font-semibold active:-translate-y-1 active:bg-accent"
                >
                    Clear
                    {/* <HugeiconsIcon icon={TextClearIcon} /> */}
                    {/* <Delete className="size-6" /> */}
                </button>

                <button
                    type="button"
                    onClick={handleEnter}
                    className="flex h-14 items-center justify-center rounded-lg bg-primary text-primary-foreground active:-translate-y-1 active:bg-accent"
                >
                    <HugeiconsIcon icon={Check} />
                    {/* <Check className="size-6" /> */}
                </button>
            </div>
        </div>,
        document.body,
    );
}
