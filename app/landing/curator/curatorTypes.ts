import type { CuratorProject } from "./curatorData";

export type CuratorScreen = "today" | "compose" | "publish" | "done" | "projects" | "settings";
export type CuratorView = "ready" | "aside";
export type DetailCtx = "ready" | "aside" | "selected";
export type AudioMode = "remove" | "keep";
export type PubMode = "now" | "schedule";

export interface CuratorFields {
  name: string;
  tagName: string;
  tagChallenge: string;
  tagDaily: string;
  start: string;
  end: string;
  window: string;
  template: string;
  disclaimer: string;
}

export interface CuratorSettings {
  mention: boolean;
  daily: boolean;
  missing: string;
  audio: AudioMode;
  image: boolean;
  carousel: boolean;
  reel: boolean;
}

export interface CuratorState {
  screen: CuratorScreen;
  view: CuratorView;
  selected: string[];
  overrides: Record<string, "ready" | "aside" | undefined>;
  detail: string | null;
  detailCtx: DetailCtx;
  verify: Record<string, "verified" | "none" | undefined>;
  audio: Record<string, AudioMode | undefined>;
  opening: string;
  closing: string;
  hashtags: string;
  plain: boolean;
  plainText: string;
  pIdx: number;
  flash: Record<string, boolean>;
  dragId: string | null;
  overId: string | null;
  moved: boolean;
  pubMode: PubMode;
  pubTime: string;
  publishing: boolean;
  pubStep: number;
  igOpen: boolean;
  timeAnswer: string | null;
  elapsed: string;
  toast: string | null;
  projects: CuratorProject[];
  fresh: string | null;
  dupOpen: boolean;
  dupSource: string;
  dupName: string;
  dupInherit: Record<string, boolean>;
  prompts: Record<number, string>;
  showAllPrompts: boolean;
  set: CuratorSettings;
  f: CuratorFields;
  w: number;
}

export function initCuratorState(projects: CuratorProject[]): CuratorState {
  return {
    screen: "today",
    view: "ready",
    selected: [],
    overrides: {},
    detail: null,
    detailCtx: "ready",
    verify: {},
    audio: {},
    opening: "Day 16 ✨\n\nAnother beautiful day of Creative October.\n\nToday's featured artists:",
    closing: "Thank you everyone for participating!",
    hashtags: "#creativeoctober2026 #creativeoctober2026_day16",
    plain: false,
    plainText: "",
    pIdx: 0,
    flash: {},
    dragId: null,
    overId: null,
    moved: false,
    pubMode: "now",
    pubTime: "18:00",
    publishing: false,
    pubStep: 0,
    igOpen: false,
    timeAnswer: null,
    elapsed: "",
    toast: null,
    projects,
    fresh: null,
    dupOpen: false,
    dupSource: "",
    dupName: "Creative October 2027",
    dupInherit: { rules: true, tags: true, caption: true, selection: true, publishing: true, terms: true },
    prompts: {},
    showAllPrompts: false,
    set: { mention: true, daily: true, missing: "aside", audio: "remove", image: true, carousel: true, reel: true },
    f: {
      name: "Creative October 2026",
      tagName: "creativeoctober",
      tagChallenge: "#{name}{yyyy}",
      tagDaily: "#{name}{yyyy}_day{dd}",
      start: "2026-10-01",
      end: "2026-10-31",
      window: "exact",
      template:
        "Day {day} {title} ✨\n\nAnother beautiful day of Creative October.\n\nToday's featured artists:\n\n{credits}\n\nThank you everyone for participating!\n\n{hashtags}",
      disclaimer:
        "By posting with #creativeoctober2026 and tagging @creativeoctober, you allow @creativeoctober to repost your work with credit on Instagram during the challenge.",
    },
    w: 1200,
  };
}
