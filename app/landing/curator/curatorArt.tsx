import type { CSSProperties, ReactElement } from "react";
import { rng, type ArtKind } from "./curatorData";

/**
 * Procedural placeholder-art generator, ported from `makeArt`/`makeArtInner`.
 * Deterministic (seeded) — same seed always produces the same artwork, so it
 * is safe to call during server render without causing a hydration mismatch.
 * Uses CSS container-query units (`cqw`) exactly as the source does, so each
 * piece scales with the thumbnail/card it's rendered into.
 */

interface Palette {
  bg: string;
  ink: string;
  acc: string;
}

const PALETTES: Palette[] = [
  { bg: "#EFE6D6", ink: "#1F1D1A", acc: "#B4442E" },
  { bg: "#1E2A3A", ink: "#F1E9DA", acc: "#D9A441" },
  { bg: "#E9D8C4", ink: "#3B2A20", acc: "#7A8B5A" },
  { bg: "#F6F2EA", ink: "#24324A", acc: "#E07B54" },
  { bg: "#2C2B28", ink: "#E8E2D4", acc: "#C9B27C" },
  { bg: "#D8DCCB", ink: "#2D3A2E", acc: "#A3542F" },
  { bg: "#F1D9CF", ink: "#5A2333", acc: "#2F4858" },
  { bg: "#C7D3DA", ink: "#1B2B36", acc: "#F2EBDD" },
];

const ART_KINDS: ArtKind[] = [
  "calligraphy", "lettering", "typography", "stripes", "dots", "ink", "arches", "waves", "collage", "staff",
];

function f(n: number): string {
  return n.toFixed(1);
}

export function makeArt(kind: ArtKind, pal: number, seed: number): ReactElement {
  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", containerType: "inline-size" } as CSSProperties}>
      {makeArtInner(kind, pal, seed)}
    </div>
  );
}

/** Deterministic art for a non-submission context (project thumbnails) — ported from `projArt`. */
export function projArt(seed: number, kinds: ArtKind[] = ART_KINDS): ReactElement {
  const r = rng(seed * 97);
  return makeArt(kinds[Math.floor(r() * 10)], Math.floor(r() * 8), seed * 13);
}

function makeArtInner(kind: ArtKind, pi: number, seed: number): ReactElement {
  const r = rng(seed);
  const pick = <T,>(a: T[]): T => a[Math.floor(r() * a.length)];
  const P = PALETTES[pi];
  const base: CSSProperties = {
    position: "absolute",
    inset: 0,
    overflow: "hidden",
    background: P.bg,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  };

  if (kind === "calligraphy") {
    const w = pick(["October", "october", "Oo", "autumn", "letters", "O"]);
    const size = w.length <= 2 ? 50 : w.length <= 6 ? 27 : 22;
    return (
      <div
        style={{
          ...base,
          backgroundImage: `repeating-linear-gradient(0deg, transparent 0 calc(16cqw - 1px), ${P.ink}22 calc(16cqw - 1px) 16cqw), repeating-linear-gradient(55deg, transparent 0 calc(9cqw - 1px), ${P.ink}10 calc(9cqw - 1px) 9cqw)`,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-pinyon-script), cursive",
            fontSize: size + "cqw",
            color: P.ink,
            lineHeight: 1,
            whiteSpace: "nowrap",
            transform: `rotate(${f(-9 + r() * 6)}deg)`,
          }}
        >
          {w}
        </span>
        <span
          style={{
            position: "absolute",
            right: "7cqw",
            bottom: "6cqw",
            fontFamily: "var(--font-bodoni-moda), serif",
            fontStyle: "italic",
            fontSize: "7cqw",
            color: P.acc,
          }}
        >
          16
        </span>
      </div>
    );
  }

  if (kind === "lettering") {
    const w = pick([
      ["OCT", "OBER"],
      ["DAY", "16"],
      ["ONE", "TWO"],
      ["INK", "INK"],
      ["ART", "ART"],
    ]);
    return (
      <div
        style={{
          ...base,
          backgroundImage: `repeating-linear-gradient(${pick([0, 90, 45])}deg, ${P.bg} 0 6%, ${P.ink}0f 6% 12%)`,
        }}
      >
        <div
          style={{
            fontFamily: "var(--font-bagel-fat-one), sans-serif",
            fontSize: (w[0].length > 3 ? 23 : 28) + "cqw",
            lineHeight: 0.84,
            color: P.acc,
            textShadow: `1.3cqw 1.3cqw 0 ${P.ink}`,
            textAlign: "center",
            transform: `rotate(${f(-7 + r() * 14)}deg)`,
          }}
        >
          {w[0]}
          <br />
          {w[1]}
        </div>
      </div>
    );
  }

  if (kind === "typography") {
    const sizes = pick([
      [7, 10, 14, 20, 14, 10, 7],
      [20, 16, 12, 9, 7, 5],
      [6, 9, 13, 18, 24],
    ]);
    const hi = Math.floor(r() * sizes.length);
    return (
      <div style={{ ...base }}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: pick(["center", "flex-start", "flex-end"]) as CSSProperties["alignItems"],
            width: "100%",
            padding: "0 8cqw",
            fontFamily: "var(--font-bodoni-moda), serif",
            fontStyle: "italic",
            lineHeight: 0.92,
          }}
        >
          {sizes.map((z, i) => (
            <span key={i} style={{ fontSize: z + "cqw", fontWeight: i % 2 ? 400 : 800, color: i === hi ? P.acc : P.ink }}>
              october
            </span>
          ))}
        </div>
      </div>
    );
  }

  if (kind === "stripes") {
    const a = 2 + r() * 3;
    const b = a + 2 + r() * 3;
    const c = b + 1 + r() * 2;
    const d = c + 3 + r() * 5;
    return (
      <div
        style={{
          ...base,
          backgroundImage: `repeating-linear-gradient(${pick([0, 90, 45, -30, 15])}deg, ${P.ink} 0 ${f(a)}%, ${P.bg} ${f(a)}% ${f(b)}%, ${P.acc} ${f(b)}% ${f(c)}%, ${P.bg} ${f(c)}% ${f(d)}%)`,
        }}
      />
    );
  }

  if (kind === "dots") {
    const g = 8 + r() * 7;
    return (
      <div
        style={{
          ...base,
          backgroundColor: P.bg,
          backgroundImage: `radial-gradient(circle, ${P.acc} 0 22%, transparent 24%), radial-gradient(circle, ${P.ink} 0 33%, transparent 35%)`,
          backgroundSize: `${f(g * 2)}cqw ${f(g * 2)}cqw, ${f(g)}cqw ${f(g)}cqw`,
          backgroundPosition: `${f(g / 2)}cqw ${f(g / 2)}cqw, 0 0`,
        }}
      />
    );
  }

  if (kind === "ink") {
    const layers: string[] = [];
    const nb = 3 + Math.floor(r() * 4);
    for (let i = 0; i < nb; i++) {
      layers.push(
        `radial-gradient(ellipse ${f(14 + r() * 30)}% ${f(8 + r() * 20)}% at ${f(10 + r() * 80)}% ${f(10 + r() * 80)}%, ${i === 0 ? P.acc : P.ink}${pick(["f0", "d0", "a0"])} 0 50%, transparent 68%)`
      );
    }
    for (let i = 0; i < 6; i++) {
      layers.push(
        `radial-gradient(circle at ${f(r() * 100)}% ${f(r() * 100)}%, ${P.ink} 0 ${f(0.4 + r() * 1.2)}%, transparent ${f(1.8 + r())}%)`
      );
    }
    return <div style={{ ...base, backgroundImage: layers.join(",") }} />;
  }

  if (kind === "arches") {
    const per = 14 + r() * 8;
    const col = per * (0.25 + r() * 0.2);
    return (
      <div
        style={{
          ...base,
          backgroundImage: `linear-gradient(180deg, rgba(255,244,220,.28), rgba(0,0,0,.38)), repeating-linear-gradient(90deg, ${P.ink} 0 ${f(col)}%, ${P.acc} ${f(col)}% ${f(col + 1.2)}%, ${P.bg} ${f(col + 1.2)}% ${f(per)}%)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: 0,
            height: "34%",
            backgroundImage: `radial-gradient(circle at 50% 100%, transparent 0 46%, ${P.ink} 47%)`,
            backgroundSize: `${f(per)}% 100%`,
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: "22%",
            background: `linear-gradient(180deg, ${P.ink}, ${P.ink}cc)`,
          }}
        />
      </div>
    );
  }

  if (kind === "waves") {
    const p = 3 + r() * 3;
    return (
      <div
        style={{
          ...base,
          backgroundImage: `repeating-radial-gradient(circle at ${f(r() * 100)}% ${f(r() * 100)}%, ${P.ink} 0 0.6cqw, ${P.bg} 0.6cqw ${f(p)}cqw)`,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: f(18 + r() * 20) + "%",
            aspectRatio: "1",
            borderRadius: "50%",
            left: f(r() * 60) + "%",
            top: f(r() * 60) + "%",
            background: P.acc,
          }}
        />
      </div>
    );
  }

  if (kind === "collage") {
    const kids = [];
    for (let i = 0; i < 6; i++) {
      kids.push(
        <div
          key={i}
          style={{
            position: "absolute",
            left: f(-5 + r() * 65) + "%",
            top: f(-5 + r() * 70) + "%",
            width: f(22 + r() * 40) + "%",
            height: f(12 + r() * 32) + "%",
            background: pick([P.ink, P.acc, P.acc, P.ink + "cc", "#F6F1E6"]),
            transform: `rotate(${f(-22 + r() * 44)}deg)`,
            borderRadius: i === 2 ? "50%" : 0,
            mixBlendMode: "multiply",
          }}
        />
      );
    }
    return <div style={{ ...base }}>{kids}</div>;
  }

  // "staff" (default)
  const kids = [];
  for (let i = 0; i < 9; i++) {
    kids.push(
      <span
        key={i}
        style={{
          position: "absolute",
          left: 6 + i * 10 + "%",
          top: f(30 + Math.sin(i * 0.9 + r()) * 18 + r() * 6) + "%",
          width: "6cqw",
          height: "6cqw",
          borderRadius: "50%",
          background: i === 4 ? P.acc : P.ink,
        }}
      />
    );
  }
  return (
    <div
      style={{
        ...base,
        backgroundImage: `repeating-linear-gradient(0deg, transparent 0 calc(4.5cqw - 1px), ${P.ink}66 calc(4.5cqw - 1px) 4.5cqw)`,
      }}
    >
      {kids}
    </div>
  );
}
