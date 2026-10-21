/**
 * Deterministic sample-data generator, ported line-for-line from
 * `Grafeat prototype.zip` → `Challenge Curator.dc.html`'s `rng()`/`buildData()`.
 * Pure and seeded — no Date.now()/Math.random() — so it produces identical
 * output on the server and the client (required to avoid hydration
 * mismatches, since this feeds a client component that Next.js also
 * server-renders for the first paint).
 */

export type ArtKind =
  | "calligraphy"
  | "lettering"
  | "typography"
  | "stripes"
  | "dots"
  | "ink"
  | "arches"
  | "waves"
  | "collage"
  | "staff";

export type ItemStatus = "ready" | "missing" | "wrong";

export interface CuratorItem {
  id: string;
  handle: string;
  kind: ArtKind;
  pal: number;
  seed: number;
  status: ItemStatus;
  isVideo: boolean;
  dur: number;
  mat: string;
  featured: string | null;
  reason?: string;
  tagsOverride?: string;
  capOverride?: string;
  collab?: string;
  sep?: boolean;
  wrongDate?: string;
  timeLabel: string;
  postedLabel: string;
  caption: string;
}

export interface CuratorProject {
  id: string;
  name: string;
  dates: string;
  status: "active" | "draft" | "done";
  note: string;
  seeds: number[];
}

export interface CuratorData {
  items: CuratorItem[];
  byId: Record<string, CuratorItem>;
  kindLabels: Record<ArtKind, string>;
  projects: CuratorProject[];
  kinds: ArtKind[];
}

export function rng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickFrom<T>(r: () => number, a: T[]): T {
  return a[Math.floor(r() * a.length)];
}

function shuffleInPlace<T>(r: () => number, a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const KINDS: ArtKind[] = [
  "calligraphy",
  "lettering",
  "typography",
  "stripes",
  "dots",
  "ink",
  "arches",
  "waves",
  "collage",
  "staff",
];

const KIND_LABELS: Record<ArtKind, string> = {
  calligraphy: "Calligraphy",
  lettering: "Lettering",
  typography: "Typography",
  stripes: "Painting",
  dots: "Illustration",
  ink: "Abstract ink",
  arches: "Photography",
  waves: "Drawing",
  collage: "Collage",
  staff: "Sketch",
};

const MATS: Record<ArtKind, string[]> = {
  calligraphy: [
    "Pointed pen, walnut ink on cotton paper.",
    "Broad-edge italic in gouache.",
    "Copperplate drills until the spacing felt like a beat.",
  ],
  lettering: ["Brush lettering, gouache, one take.", "Chunky letters and flat colour."],
  typography: ["One word, seven sizes. Printed on the riso.", "Type specimen, one word."],
  stripes: ["Masking tape and acrylic.", "Painted stripes, uneven on purpose."],
  dots: ["Posca dots, counted in fours.", "Dot study in two colours."],
  ink: ["Sumi ink, wet on wet.", "Ink and a lot of water."],
  arches: ["35mm. An arcade at 7am.", "Shadows on the stairs at noon."],
  waves: ["Graphite, compass and an eraser.", "Concentric lines, one breath each."],
  collage: ["Cut paper from old magazines.", "Collage, scissors only."],
  staff: ["Fineliner, drawn to a metronome at 90 bpm.", "Repeated marks in a cheap sketchbook."],
};

type Named = [string, ArtKind] | [string, ArtKind, number];

const NAMED: Named[] = [
  ["maya_letters", "calligraphy"],
  ["anna_draws", "dots"],
  ["johnillustrates", "collage"],
  ["studio_lina", "typography"],
  ["markdraws", "staff"],
  ["inkandmoss", "ink"],
  ["sophiecreates", "lettering"],
  ["paperandform", "collage"],
  ["nora_sketches", "waves"],
  ["typebyjules", "typography"],
  ["line.and.light", "arches", 12],
  ["littlebrushstudio", "lettering", 21],
  ["madebyines", "stripes"],
  ["thequietpen", "calligraphy"],
  ["ezra_type", "typography"],
];

interface NeedsDef {
  h: string;
  kind: ArtKind;
  status: ItemStatus;
  reason?: string;
  tags?: string;
  cap?: string;
  collab?: string;
}

const NEEDS_DEF: NeedsDef[] = [
  {
    h: "hana.paper",
    kind: "calligraphy",
    status: "missing",
    reason: "Wrote #creativeoctober2026day16, without the underscore",
    tags: "#creativeoctober2026 #creativeoctober2026day16",
  },
  { h: "kai.sketchbook", kind: "waves", status: "ready", cap: "Day 15 — Motion, a day late! Graphite and an eraser." },
  { h: "luz.lines", kind: "staff", status: "missing", reason: "Hashtags were in a comment, not the caption", tags: "" },
  { h: "marco_ink", kind: "ink", status: "ready", collab: "vera_brush" },
  { h: "ezra_type", kind: "typography", status: "ready" },
];

const WRONG_REASONS = [
  "Posted Oct 15, 21:04 · before Day 16 opened",
  "Posted Oct 15, 23:41 · before Day 16 opened",
  "Posted Oct 14, 18:20 · two days early",
  "Posted Oct 15, 22:58 · before Day 16 opened",
  "Posted Oct 9, 11:02 · older post, hashtags added later",
  "Posted Oct 15, 20:15 · before Day 16 opened",
  "Posted Oct 15, 23:56 · 4 min before Day 16 opened",
];

const FIRST_NAMES = [
  "ana", "leo", "mira", "tomas", "yuki", "priya", "elif", "jonas", "clara", "omar",
  "felix", "hana", "sami", "lucia", "theo", "rosa", "vera", "nils", "ada", "ravi",
  "mei", "oskar", "lena", "dario", "zoe", "ilse", "pablo", "noor", "emil", "sara",
  "femi", "juno", "alba", "iris", "milo", "tara", "luz", "beatriz", "kofi", "greta",
];

const SUFFIXES = [
  "_letters", ".draws", "inks", "_studio", ".sketchbook", "_type", "makes", ".paper",
  "_handmade", ".lines", "_brush", ".art", "_calligraphy", ".ink", "scribbles", "_press",
  ".collage", "paints",
];

const PREV_FEATURED: Record<string, string> = {
  maya_letters: "Day 3",
  paperandform: "Day 9",
  studio_lina: "Day 12",
  anna_draws: "Day 7",
  inkandmoss: "Day 14",
  markdraws: "Day 5",
};

function pad2(x: number): string {
  return String(x).padStart(2, "0");
}

export function buildData(): CuratorData {
  const r = rng(1616);
  const pick = <T,>(a: T[]) => pickFrom(r, a);
  const shuffle = <T,>(a: T[]) => shuffleInPlace(r, a);

  const named = NAMED;
  const needsDef = NEEDS_DEF;
  const used = new Set<string>([...named.map((n) => n[0]), ...needsDef.map((n) => n.h), "vera_brush"]);
  const gen: string[] = [];
  while (gen.length < 184 - named.length - needsDef.length) {
    const h = pick(FIRST_NAMES) + pick(SUFFIXES);
    if (!used.has(h)) {
      used.add(h);
      gen.push(h);
    }
  }

  const items: CuratorItem[] = [];
  let n = 0;
  const mk = (
    h: string,
    kind: ArtKind,
    status: ItemStatus,
    x: Partial<CuratorItem> & { noVid?: boolean } = {}
  ): CuratorItem => {
    const isVideo = x.dur ? true : x.noVid ? false : r() < 0.07;
    const it: CuratorItem = {
      id: "s" + n++,
      handle: h,
      kind,
      pal: Math.floor(r() * 8),
      seed: Math.floor(r() * 1e9),
      status,
      isVideo,
      dur: x.dur || (isVideo ? 8 + Math.floor(r() * 22) : 0),
      mat: pick(MATS[kind]),
      featured: r() < 0.12 ? "Day " + (1 + Math.floor(r() * 15)) : null,
      timeLabel: "",
      postedLabel: "",
      caption: "",
    };
    Object.assign(it, x);
    items.push(it);
    return it;
  };

  const top = named.map(([h, k, d]) => mk(h, k, "ready", d ? { dur: d } : { noVid: true }));

  gen.forEach((h, i) => {
    const kind = pick(KINDS);
    if (i < 21) {
      mk(h, kind, "missing", {
        reason: i % 3 === 0 ? "Used #day16 instead of the daily hashtag" : "No #creativeoctober2026_day16",
        sep: i % 3 === 0,
      });
    } else if (i < 28) {
      mk(h, kind, "wrong", {
        reason: WRONG_REASONS[i - 21],
        wrongDate: WRONG_REASONS[i - 21].split(" · ")[0].replace("Posted ", ""),
      });
    } else {
      mk(h, kind, "ready");
    }
  });

  needsDef.forEach((d) => {
    mk(d.h, d.kind, d.status, {
      reason: d.reason,
      tagsOverride: d.tags,
      capOverride: d.cap,
      collab: d.collab,
      noVid: true,
    });
  });

  const rest = items.slice(named.length);
  const head = shuffle([...top, ...rest.filter((i) => i.status === "ready").slice(0, 9)]);
  const headIds = new Set(head.map((i) => i.id));
  const ordered = [...head, ...shuffle(rest.filter((i) => !headIds.has(i.id)))];

  ordered.forEach((it, i) => {
    const m = Math.max(7, Math.round(995 - i * 5.35 - r() * 3));
    it.timeLabel = it.wrongDate ? it.wrongDate.split(",")[0] : pad2(Math.floor(m / 60)) + ":" + pad2(m % 60);
    it.postedLabel = it.wrongDate ? it.wrongDate : "Oct 16, " + it.timeLabel;
    const tags =
      it.tagsOverride !== undefined
        ? it.tagsOverride
        : it.status === "missing"
          ? it.sep
            ? "#creativeoctober2026 #day16"
            : "#creativeoctober2026"
          : "#creativeoctober2026 #creativeoctober2026_day16";
    it.caption = (it.capOverride || "Day 16. " + it.mat) + "\n\n@creativeoctober" + (tags ? " " + tags : "");
  });

  const byId: Record<string, CuratorItem> = {};
  ordered.forEach((i) => {
    byId[i.id] = i;
  });
  ordered.forEach((i) => {
    if (PREV_FEATURED[i.handle]) i.featured = PREV_FEATURED[i.handle];
  });

  const projects: CuratorProject[] = [
    { id: "co26", name: "Creative October 2026", dates: "Oct 1–31, 2026", status: "active", note: "Day 16 of 31 · 15 features published", seeds: [11, 12, 13, 14] },
    { id: "lm26", name: "Lettering May 2026", dates: "May 1–31, 2026", status: "done", note: "31 features published", seeds: [21, 22, 23, 24] },
    { id: "co25", name: "Creative October 2025", dates: "Oct 1–31, 2025", status: "done", note: "31 features published", seeds: [31, 32, 33, 34] },
  ];

  return { items: ordered, byId, kindLabels: KIND_LABELS, projects, kinds: KINDS };
}

/** Fills {name}/{yyyy}/{yy}/{dd}/{d} in a hashtag template — ported from `genTag()`. */
export function genTag(tpl: string, tagName: string, y: number, d: number): string {
  const nm = (tagName || "").toLowerCase().replace(/[^a-z0-9_]/g, "");
  const t = (tpl || "")
    .replace(/\{name\}/gi, nm)
    .replace(/\{yyyy\}/gi, String(y))
    .replace(/\{yy\}/gi, String(y).slice(2))
    .replace(/\{dd\}/gi, pad2(d))
    .replace(/\{d\}/gi, String(d))
    .replace(/\s+/g, "");
  return t && t[0] !== "#" ? "#" + t : t;
}

export function fmtDur(s: number): string {
  return s ? "0:" + String(s).padStart(2, "0") : "";
}
