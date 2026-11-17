"use client";

export type BlobVariant = 1 | 2 | 3 | 4 | 5 | 6;

export type BlobCardProps = {
    title: string;
    /** Pilihan pattern: 1 sampai 6 (default 1) */
    variant?: BlobVariant;
    onClick?: () => void;
    onRemove?: () => void;
    width?: number;
    height?: number;
};

type VariantConfig = {
    bg: string;
    /** Path SVG dalam koordinat card 200 x 230 (boleh keluar tepi, nanti terpotong) */
    shapes: { color: string; d: string }[];
};

const VARIANTS: Record<BlobVariant, VariantConfig> = {
    // Biru: blob tosca kiri atas, blob pink kanan dan bawah
    1: {
        bg: "#6C72F5",
        shapes: [
            {
                color: "#7ACBC0",
                d: "M -20 -10 L 95 -10 C 105 20 75 42 48 55 C 22 68 -8 62 -20 40 Z",
            },
            {
                color: "#F29BC4",
                d: "M 215 95 C 188 88 165 108 168 135 C 171 160 195 168 215 160 Z",
            },
            {
                color: "#F29BC4",
                d: "M 60 245 C 62 215 95 198 132 208 C 160 216 185 235 215 245 Z",
            },
        ],
    },

    // Kuning: blob biru kanan atas, blob tosca kiri bawah
    2: {
        bg: "#F6C76B",
        shapes: [
            {
                color: "#6C72F5",
                d: "M 125 -10 C 152 6 160 36 188 60 C 204 74 215 96 215 96 L 215 -10 Z",
            },
            {
                color: "#5CBFB0",
                d: "M -20 150 C 12 138 56 146 66 182 C 76 216 54 250 54 250 L -20 250 Z",
            },
        ],
    },

    // Pink: pita tosca di atas, blob biru kanan bawah
    3: {
        bg: "#F29BC4",
        shapes: [
            {
                color: "#4FA79B",
                d: "M -10 -10 L 215 -10 L 215 42 C 182 30 150 56 110 50 C 70 44 40 28 -10 56 Z",
            },
            {
                color: "#6C72F5",
                d: "M 215 168 C 182 164 152 188 142 214 C 136 232 120 245 120 245 L 215 245 Z",
            },
        ],
    },

    // Tosca: lingkaran kuning kanan atas, gelombang coral di bawah
    4: {
        bg: "#5CBFB0",
        shapes: [
            {
                color: "#F6C76B",
                d: "M 150 -25 C 185 -25 225 5 215 45 C 205 82 160 90 135 68 C 110 46 118 -25 150 -25 Z",
            },
            {
                color: "#E8788F",
                d: "M -10 180 C 30 160 70 200 110 190 C 150 180 175 165 215 185 L 215 245 L -10 245 Z",
            },
        ],
    },

    // Coral: blob biru kiri atas, gelombang kuning di bawah
    5: {
        bg: "#E8788F",
        shapes: [
            {
                color: "#6C72F5",
                d: "M -25 -15 C 30 -25 80 -10 78 28 C 76 62 35 80 5 70 C -20 62 -30 20 -25 -15 Z",
            },
            {
                color: "#F6C76B",
                d: "M -10 200 C 35 215 75 185 120 195 C 160 204 185 225 215 215 L 215 245 L -10 245 Z",
            },
        ],
    },

    // Ungu: blob pink kiri atas, blob kuning kanan bawah
    6: {
        bg: "#9B7BEA",
        shapes: [
            {
                color: "#F29BC4",
                d: "M -15 40 C -10 5 40 -15 75 5 C 100 20 90 55 60 70 C 30 85 -18 78 -15 40 Z",
            },
            {
                color: "#F6C76B",
                d: "M 215 150 C 180 140 135 165 130 200 C 126 228 145 245 145 245 L 215 245 Z",
            },
        ],
    },
};

export const BLOB_VARIANTS = Object.keys(VARIANTS).map(Number) as BlobVariant[];

export default function BlobCard({
    title,
    variant = 1,
    onClick,
    onRemove,
    width = 200,
    height = 230,
}: BlobCardProps) {
    const config = VARIANTS[variant] ?? VARIANTS[1];

    return (
        <div
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onClick={onClick}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick();
                }
            }}
            style={{
                position: "relative",
                width,
                height,
                borderRadius: 20,
                background: config.bg,
                overflow: "hidden",
                cursor: onClick ? "pointer" : "default",
                flexShrink: 0,
            }}
        >
            <svg
                viewBox="0 0 200 230"
                preserveAspectRatio="xMidYMid slice"
                aria-hidden="true"
                style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                }}
            >
                {config.shapes.map((s, i) => (
                    <path key={i} d={s.d} fill={s.color} />
                ))}
            </svg>

            <div
                style={{
                    position: "relative",
                    zIndex: 1,
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 24,
                    textAlign: "center",
                    color: "#fff",
                    fontSize: 26,
                    fontWeight: 700,
                    lineHeight: 1.2,
                    letterSpacing: 0.3,
                    textShadow: "0 1px 2px rgba(0,0,0,0.15)",
                }}
            >
                {title}
            </div>

            {onRemove && (
                <button
                    type="button"
                    aria-label={`Hapus ${title}`}
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove();
                    }}
                    style={{
                        position: "absolute",
                        top: 10,
                        right: 10,
                        zIndex: 2,
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        border: "none",
                        background: "#fff",
                        color: "#222",
                        fontSize: 16,
                        fontWeight: 700,
                        lineHeight: 1,
                        cursor: "pointer",
                    }}
                >
                    ×
                </button>
            )}
        </div>
    );
}

/* ---------- Contoh pemakaian ---------- */
export function Demo() {
    return (
        <div
            style={{
                display: "flex",
                gap: 16,
                padding: 32,
                background: "#2B2F8F",
                minHeight: "100vh",
                alignItems: "center",
                flexWrap: "wrap",
            }}
        >
            <BlobCard title="Highest return" variant={1} onRemove={() => {}} />
            <BlobCard title="Longest holding time" variant={2} />
            <BlobCard title="Highest return per trade" variant={3} />
            <BlobCard title="Variant 4" variant={4} />
            <BlobCard title="Variant 5" variant={5} />
            <BlobCard title="Variant 6" variant={6} />
        </div>
    );
}
