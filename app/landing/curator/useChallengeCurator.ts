"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement, type RefObject } from "react";
import { buildData, fmtDur, genTag, type CuratorData, type CuratorItem } from "./curatorData";
import { makeArt, projArt } from "./curatorArt";
import { initCuratorState, type CuratorState, type DetailCtx } from "./curatorTypes";

interface DetailCheck {
  label: string;
  ok: boolean;
  note?: string;
  fail: boolean;
  review: boolean;
  hasNote: boolean;
}

interface DetailModel {
  id: string;
  handle: string;
  time: string;
  art: ReactElement;
  isVideo: boolean;
  dur: string;
  kindLabel: string;
  posted: string;
  media: string;
  caption: string;
  checks: DetailCheck[];
  featured: string | null;
  hasFeatured: boolean;
  postUrl: string;
  canSelect: boolean;
  isSelected: boolean;
  selNum: number;
  nextNum: number;
  isAside: boolean;
  onSelect: () => void;
  onInclude: () => void;
}

export interface ChallengeCuratorProps {
  tapAction?: "select" | "detail";
  onPublished?: (r: { count: number; seconds: number }) => void;
  onTimeAnswer?: (label: string) => void;
  onCta?: () => void;
}

const TIME_OPTIONS = ["Under 30 min", "30–60 min", "1–2 hours", "More than 2 hours", "I don't feature daily"];

function baseFields(it: CuratorItem) {
  return {
    id: it.id,
    handle: it.handle,
    time: it.timeLabel,
    art: makeArt(it.kind, it.pal, it.seed),
    isVideo: it.isVideo,
    dur: fmtDur(it.dur),
    kindLabel: it.kind,
  };
}

/**
 * Faithful port of Challenge Curator.dc.html's `Component` class: one state
 * object, one set of handlers, one big derived view model recomputed every
 * render (matching the source's un-memoized `renderVals()`). Kept as a
 * single hook per the Design Notes export's own recommendation ("one client
 * component, one reducer").
 */
export function useChallengeCurator(props: ChallengeCuratorProps) {
  const dataRef = useRef<CuratorData | null>(null);
  if (!dataRef.current) dataRef.current = buildData();
  const data = dataRef.current;

  const [state, setState] = useState<CuratorState>(() => initCuratorState(dataRef.current!.projects));
  const startRef = useRef<number>(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const setRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const publishTimer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  const patch = useCallback((p: Partial<CuratorState> | ((s: CuratorState) => Partial<CuratorState>)) => {
    setState((s) => ({ ...s, ...(typeof p === "function" ? p(s) : p) }));
  }, []);

  useEffect(() => {
    startRef.current = Date.now();
    const el = rootRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      setState((s) => (Math.abs(w - s.w) > 4 ? { ...s, w } : s));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(
    () => () => {
      clearTimeout(toastTimer.current);
      clearTimeout(flashTimer.current);
      clearInterval(publishTimer.current);
    },
    []
  );

  const showToast = useCallback(
    (msg: string) => {
      clearTimeout(toastTimer.current);
      patch({ toast: msg });
      toastTimer.current = setTimeout(() => patch({ toast: null }), 2800);
    },
    [patch]
  );

  const stopEv = useCallback((e?: { stopPropagation?: () => void }) => {
    e?.stopPropagation?.();
  }, []);

  const doFlash = useCallback((flash: Record<string, boolean>) => {
    clearTimeout(flashTimer.current);
    setState((s) => ({ ...s, flash: {} }));
    setTimeout(() => setState((s) => ({ ...s, flash })), 0);
    flashTimer.current = setTimeout(() => setState((s) => ({ ...s, flash: {} })), 1400);
  }, []);

  const toggle = useCallback(
    (id: string) => {
      setState((s) => {
        if (s.selected.includes(id)) {
          const sel = s.selected.filter((x) => x !== id);
          return { ...s, selected: sel, pIdx: Math.min(s.pIdx, Math.max(0, sel.length - 1)) };
        }
        if (s.selected.length >= 10) {
          showToast("Today's feature is full. Instagram carousels hold up to 10 slides.");
          return s;
        }
        const it = data.byId[id];
        const audio = it.isVideo && !s.audio[id] ? { ...s.audio, [id]: s.set.audio } : s.audio;
        return { ...s, selected: [...s.selected, id], audio };
      });
    },
    [data, showToast]
  );

  const removeSel = useCallback(
    (id: string) => {
      setState((s) => {
        const sel = s.selected.filter((x) => x !== id);
        const flash: Record<string, boolean> = {};
        sel.forEach((x, i) => {
          if (s.selected.indexOf(x) !== i) flash[x] = true;
        });
        doFlash(flash);
        return { ...s, selected: sel, pIdx: Math.min(s.pIdx, Math.max(0, sel.length - 1)) };
      });
    },
    [doFlash]
  );

  const move = useCallback(
    (from: number, to: number) => {
      setState((s) => {
        const sel = s.selected;
        if (to < 0 || to >= sel.length || from === to) return s;
        const a = [...sel];
        const [x] = a.splice(from, 1);
        a.splice(to, 0, x);
        const flash: Record<string, boolean> = {};
        a.forEach((id, i) => {
          if (sel.indexOf(id) !== i) flash[id] = true;
        });
        doFlash(flash);
        return { ...s, selected: a, pIdx: to, moved: true };
      });
    },
    [doFlash]
  );

  const go = useCallback(
    (screen: CuratorState["screen"]) => {
      setState((s) => {
        if (screen === "compose" && !s.selected.length) {
          showToast("Pick at least one work first.");
          return s;
        }
        return { ...s, screen, detail: null };
      });
    },
    [showToast]
  );

  const setView = useCallback((view: CuratorState["view"]) => patch({ view, screen: "today" }), [patch]);

  const creditsFor = useCallback(
    (sel: string[]) =>
      sel.map((id, i) => {
        const it = data.byId[id];
        return { id, text: `${i + 1}. @${it.handle}${it.collab ? " & @" + it.collab : ""}` };
      }),
    [data]
  );

  const fullCaption = useCallback(
    (s: CuratorState) => {
      if (s.plain) return s.plainText;
      return [s.opening, creditsFor(s.selected).map((c) => c.text).join("\n"), s.closing, s.hashtags]
        .filter((x) => x && x.trim())
        .join("\n\n");
    },
    [creditsFor]
  );

  const timeLabel = useCallback((t: string) => (t === "09:00" ? "tomorrow, 09:00" : "today, " + t), []);

  const pubStepLabels = useCallback(
    (s: CuratorState) => {
      const vids = s.selected.filter((id) => data.byId[id].isVideo && s.audio[id] === "remove").length;
      return [
        `Preparing ${s.selected.length} slides at 4:5`,
        ...(vids ? [`Removing audio from ${vids} Reel${vids > 1 ? "s" : ""}`] : []),
        "Uploading to @creativeoctober",
        s.pubMode === "now" ? "Posting with caption and credits" : "Scheduling for " + timeLabel(s.pubTime),
      ];
    },
    [data, timeLabel]
  );

  const publish = useCallback(() => {
    const steps = pubStepLabels(state);
    const secs = Math.round((Date.now() - (startRef.current || Date.now())) / 1000);
    const elapsed = secs < 60 ? secs + " seconds" : Math.floor(secs / 60) + " min " + (secs % 60) + " s";
    const count = state.selected.length;
    patch({ publishing: true, pubStep: 0 });
    let k = 0;
    clearInterval(publishTimer.current);
    publishTimer.current = setInterval(() => {
      k++;
      if (k >= steps.length) {
        clearInterval(publishTimer.current);
        patch({ publishing: false, screen: "done", elapsed });
        props.onPublished?.({ count, seconds: secs });
      } else {
        patch({ pubStep: k });
      }
    }, 750);
  }, [state, pubStepLabels, patch, props]);

  const scrollToSec = useCallback((k: string) => {
    const box = setRef.current;
    if (!box) return;
    const el = box.querySelector(`[data-sec="${k}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 20;
      box.scrollTo({ top, behavior: "smooth" });
    }
  }, []);

  const resetDemo = useCallback(() => {
    startRef.current = Date.now();
    setState(initCuratorState(data.projects));
  }, [data]);

  const eff = useCallback((it: CuratorItem) => (it.status === "ready" ? "ready" : state.overrides[it.id] || it.status), [state.overrides]);

  // --- derived view model (mirrors renderVals()) ---
  const view = useMemo(() => {
    const s = state;
    const D = data;
    const sel = s.selected;
    const wide = s.w >= 760;
    const tapSelects = (props.tapAction ?? "select") === "select";

    const effOf = (it: CuratorItem): "ready" | "aside" | "missing" | "wrong" =>
      it.status === "ready" ? "ready" : s.overrides[it.id] || it.status;
    const ready = D.items.filter((it) => effOf(it) === "ready");
    const aside = D.items.filter((it) => effOf(it) === "missing" || effOf(it) === "wrong");

    const open = (ctx: DetailCtx, id: string) => (e?: { stopPropagation?: () => void }) => {
      stopEv(e);
      patch({ detail: id, detailCtx: ctx });
    };

    const gridItems =
      s.screen === "today" && s.view === "ready"
        ? ready.map((it) => {
            const i = sel.indexOf(it.id);
            const onToggleClick = (e?: { stopPropagation?: () => void }) => {
              stopEv(e);
              toggle(it.id);
            };
            return {
              ...baseFields(it),
              selected: i >= 0,
              unselected: i < 0,
              selNum: i + 1,
              onToggle: onToggleClick,
              onTap: tapSelects ? onToggleClick : open("ready", it.id),
              onOpen: open("ready", it.id),
            };
          })
        : [];

    const include = (id: string) => {
      patch((cur) => ({ overrides: { ...cur.overrides, [id]: "ready" }, detail: null }));
      showToast(`@${D.byId[id].handle} moved to Ready`);
    };
    const asideItem = (it: CuratorItem) => ({
      ...baseFields(it),
      reason: it.reason ?? "",
      onInclude: () => include(it.id),
      onOpen: open("aside", it.id),
    });
    const missing = aside.filter((i) => effOf(i) === "missing");
    const wrong = aside.filter((i) => effOf(i) === "wrong");
    const asideGroups = [
      { title: "Missing a required hashtag", count: missing.length, sub: "not in the caption, or misspelled", items: missing.map(asideItem) },
      { title: "Posted outside the Day 16 window", count: wrong.length, sub: "has today's hashtags, wrong date", items: wrong.map(asideItem) },
    ].filter((g) => g.items.length);

    const slots = Array.from({ length: 10 }, (_, i) => {
      const id = sel[i];
      return id ? { filled: true, empty: false, num: i + 1, art: makeArt(D.byId[id].kind, D.byId[id].pal, D.byId[id].seed), onClick: open("selected", id) } : { filled: false, empty: true };
    });

    let dt: DetailModel | null = null;
    if (s.detail) {
      const it = D.byId[s.detail];
      const e = effOf(it);
      const i = sel.indexOf(it.id);
      const checks = [
        { label: "Mentions @creativeoctober", ok: true },
        { label: "#creativeoctober2026", ok: it.tagsOverride !== "", note: it.tagsOverride === "" ? "Found in the first comment, not the caption." : "" },
        {
          label: "#creativeoctober2026_day16",
          ok: it.status !== "missing" && !it.tagsOverride,
          note:
            it.status === "missing"
              ? it.sep
                ? "Used #day16 instead."
                : "Not found in caption."
              : it.tagsOverride
                ? it.tagsOverride === ""
                  ? "Found in the first comment, not the caption."
                  : "Found #creativeoctober2026day16 (no underscore)."
                : "",
        },
        { label: "Posted Oct 16, 00:00–23:59", ok: it.status !== "wrong", note: it.status === "wrong" ? it.reason ?? "" : "" },
      ].map((c) => ({ ...c, fail: !c.ok, review: false, hasNote: !!c.note }));
      dt = {
        ...baseFields(it),
        posted: it.postedLabel,
        media: (it.isVideo ? "Reel " + fmtDur(it.dur) : "Image") + " · " + D.kindLabels[it.kind],
        caption: it.caption,
        checks,
        featured: it.featured,
        hasFeatured: !!it.featured,
        postUrl: "https://www.instagram.com/" + it.handle + "/",
        canSelect: e === "ready" && i < 0,
        isSelected: i >= 0,
        selNum: i + 1,
        nextNum: sel.length + 1,
        isAside: ["missing", "wrong"].includes(e),
        onSelect: () => toggle(it.id),
        onInclude: () => include(it.id),
      };
    }
    const ctxList = ({ ready, aside, selected: sel.map((id) => D.byId[id]) } as Record<DetailCtx, CuratorItem[]>)[s.detailCtx] || ready;
    const navDetail = (d: number) => {
      const ids = ctxList.map((x) => x.id);
      const k = ids.indexOf(s.detail ?? "");
      if (ids.length) patch({ detail: ids[(k + d + ids.length) % ids.length] });
    };

    const vOf = (id: string) => {
      const it = D.byId[id];
      return s.verify[it.handle] || (it.featured ? "prev" : "none");
    };
    const setV = (h: string, v: "verified" | "none" | undefined) => {
      patch((cur) => {
        const nv = { ...cur.verify };
        if (v === undefined) delete nv[h];
        else nv[h] = v;
        return { verify: nv };
      });
    };
    const vCount = (k: string) => sel.filter((id) => vOf(id) === k).length;
    const vPrev = vCount("prev");
    const vToday = vCount("verified");
    const unchecked = vCount("none");
    const verified = vPrev + vToday;
    const verifySummary =
      [vPrev && vPrev + " verified previously", vToday && vToday + " verified today", unchecked && unchecked + " to verify"]
        .filter(Boolean)
        .join(" · ") || "Nothing selected";
    const unverifiedHandles = sel.filter((id) => vOf(id) === "none").map((id) => "@" + D.byId[id].handle);
    const pIdx = Math.min(s.pIdx, Math.max(0, sel.length - 1));
    const orderItems = sel.map((id, i) => {
      const it = D.byId[id];
      const v = vOf(id);
      const a = s.audio[id] || s.set.audio;
      return {
        ...baseFields(it),
        num: String(i + 1).padStart(2, "0"),
        meta: (it.isVideo ? "Reel " + fmtDur(it.dur) : D.kindLabels[it.kind]) + (it.collab ? " · with @" + it.collab : ""),
        vUnchecked: v === "none",
        vToday: v === "verified",
        vPrev: v === "prev",
        prevWhen: it.featured ? "featured " + it.featured : "",
        profileUrl: "https://www.instagram.com/" + it.handle + "/",
        onVerify: () => setV(it.handle, "verified"),
        onUndo: () => setV(it.handle, undefined),
        onReset: () => setV(it.handle, "none"),
        audioRemove: a === "remove",
        audioKeep: a === "keep",
        setRemove: () => patch((cur) => ({ audio: { ...cur.audio, [id]: "remove" } })),
        setKeep: () => patch((cur) => ({ audio: { ...cur.audio, [id]: "keep" } })),
        audioNote: a === "remove" ? "Published silent" : "Original sound kept",
        onUp: () => move(i, i - 1),
        onDown: () => move(i, i + 1),
        onRemove: () => removeSel(id),
        onPreview: () => patch({ pIdx: i }),
        isPreview: i === pIdx,
        flash: !!s.flash[id],
        isOver: s.overId === id && !!s.dragId && s.dragId !== id,
        onDragStart: (e: React.DragEvent) => {
          try {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", id);
          } catch {
            // ignore
          }
          patch({ dragId: id });
        },
        onDragOver: (e: React.DragEvent) => {
          e.preventDefault();
          setState((cur) => (cur.overId !== id ? { ...cur, overId: id } : cur));
        },
        onDrop: (e: React.DragEvent) => {
          e.preventDefault();
          setState((cur) => {
            const from = cur.selected.indexOf(cur.dragId ?? "");
            if (from >= 0) move(from, i);
            return { ...cur, dragId: null, overId: null };
          });
        },
        onDragEnd: () => patch({ dragId: null, overId: null }),
      };
    });
    const pvItem = sel.length ? D.byId[sel[pIdx]] : null;
    const pv = pvItem
      ? {
          art: makeArt(pvItem.kind, pvItem.pal, pvItem.seed),
          handle: pvItem.handle,
          pos: `${pIdx + 1} / ${sel.length}`,
          isVideo: pvItem.isVideo,
          dur: fmtDur(pvItem.dur),
          audioLabel: (s.audio[pvItem.id] || s.set.audio) === "remove" ? "Audio removed" : "Original audio",
        }
      : { art: null, handle: "", pos: "", isVideo: false, dur: "", audioLabel: "" };
    const dots = sel.map((id, i) => ({ on: i === pIdx, off: i !== pIdx, onClick: () => patch({ pIdx: i }) }));
    const credits = creditsFor(sel).map((c) => ({ ...c, flash: !!s.flash[c.id] }));
    const cap = fullCaption(s);
    const capSrc = s.plain ? s.plainText : s.hashtags;
    const missingTags = ["#creativeoctober2026_day16", "#creativeoctober2026"].filter(
      (t) => !new RegExp(t + "(?![a-z0-9_])", "i").test(capSrc)
    );
    const creditsOk = s.plain ? sel.every((id) => cap.includes("@" + D.byId[id].handle)) : true;
    const capChecks = [
      {
        label: missingTags.length ? "Missing " + missingTags.join(" ") : "Required hashtags included",
        ok: !missingTags.length,
        bad: !!missingTags.length,
        hasFix: !!missingTags.length && !s.plain,
        fixLabel: "Add",
        onFix: () => patch((cur) => ({ hashtags: (cur.hashtags + " " + missingTags.join(" ")).trim() })),
      },
      {
        label: creditsOk ? `${sel.length} of ${sel.length} creators credited, in slide order` : "Some featured creators are missing from the caption",
        ok: creditsOk,
        bad: !creditsOk,
        hasFix: false,
        fixLabel: "",
        onFix: () => {},
      },
      { label: `${cap.length.toLocaleString()} / 2,200 characters`, ok: cap.length <= 2200, bad: cap.length > 2200, hasFix: false, fixLabel: "", onFix: () => {} },
    ];
    const vids = sel.filter((id) => D.byId[id].isVideo);
    const vidsRemoved = vids.filter((id) => (s.audio[id] || s.set.audio) === "remove").length;
    const composeSummary = [
      `${sel.length} slide${sel.length === 1 ? "" : "s"}`,
      unchecked ? `${unchecked} not verified` : "all creators verified",
      vids.length ? `${vids.length} Reel${vids.length > 1 ? "s" : ""}, ${vidsRemoved === vids.length ? "audio removed" : vidsRemoved ? "mixed audio" : "original audio"}` : null,
    ]
      .filter(Boolean)
      .join(" · ");

    const pubChecks = [
      { label: `${sel.length} slides, in your order`, ok: true },
      { label: `${sel.length} creators credited in slide order`, ok: creditsOk },
      { label: unchecked ? `${unchecked} of ${sel.length} creators not verified` : `All ${sel.length} creators verified`, ok: !unchecked },
      ...(vids.length
        ? [{ label: `${vids.length} Reel${vids.length > 1 ? "s" : ""} · ${vidsRemoved ? "audio removed from " + vidsRemoved : "original audio kept"}`, ok: true }]
        : []),
      { label: "Required hashtags in caption", ok: !missingTags.length },
    ].map((k) => ({ ...k, bad: !k.ok }));
    const blockers = cap.length > 2200 ? ["length"] : [];
    const canPublish = sel.length > 0 && !blockers.length;
    const publishLabel = s.pubMode === "now" ? "Publish to @creativeoctober" : "Schedule for " + timeLabel(s.pubTime);
    const pubSteps = pubStepLabels(s).map((label, i) => ({ label, done: i < s.pubStep, active: i === s.pubStep, todo: i > s.pubStep }));
    const capLines = cap.split("\n");
    const igCollapsed = !s.igOpen && capLines.length > 3;
    const igCaption = igCollapsed ? capLines.slice(0, 3).join("\n") : cap;

    const stepDefs: Array<[CuratorState["screen"], string]> = [
      ["today", "Curate"],
      ["compose", "Compose"],
      ["publish", "Publish"],
    ];
    const curIdx = s.screen === "done" ? 3 : stepDefs.findIndex((d) => d[0] === s.screen);
    const steps = stepDefs.map(([k, label], i) => ({
      n: i + 1,
      label,
      notFirst: i > 0,
      active: i === curIdx,
      idle: i !== curIdx && (i === 0 || sel.length > 0),
      locked: i !== curIdx && i > 0 && !sel.length,
      onClick: () => go(k),
    }));

    const projectRows = s.projects.map((p) => ({
      ...p,
      active: p.status === "active",
      draft: p.status === "draft",
      done: p.status === "done",
      fresh: s.fresh === p.id,
      arts: p.seeds.map((seed) => ({ art: projArt(seed, D.kinds) })),
      onDuplicate: () =>
        patch({
          dupOpen: true,
          dupSource: p.name,
          dupName: p.name.replace(/20(\d\d)/, (_m, y: string) => "20" + (Number(y) + 1)),
        }),
    }));
    const dupLabels: Record<string, [string, string]> = {
      rules: ["Submission rules", "mention, hashtags, media"],
      tags: ["Hashtag templates", "year updates automatically"],
      caption: ["Caption template", "and hashtags"],
      selection: ["Selection settings", "max 10, manual check"],
      publishing: ["Publishing defaults", "audio, time"],
      terms: ["Participation text", "disclaimer"],
    };
    const dupItems = Object.keys(dupLabels).map((k) => ({
      label: dupLabels[k][0],
      sub: dupLabels[k][1],
      on: s.dupInherit[k],
      off: !s.dupInherit[k],
      onClick: () => patch((cur) => ({ dupInherit: { ...cur.dupInherit, [k]: !cur.dupInherit[k] } })),
    }));

    const promptRows = Array.from({ length: 31 }, (_, i) => {
      const day = i + 1;
      const val = s.prompts[day] ?? "";
      return {
        day: String(day).padStart(2, "0"),
        date: "Oct " + day,
        prompt: val,
        tag: genTag(s.f.tagDaily, s.f.tagName, 2026, day),
        isToday: day === 16,
        isPast: day < 16,
        isFuture: day > 16,
        onChange: (e: React.ChangeEvent<HTMLInputElement>) => patch((cur) => ({ prompts: { ...cur.prompts, [day]: e.target.value } })),
      };
    }).filter((_r, i) => s.showAllPrompts || (i >= 11 && i <= 19));

    const sset = (k: keyof CuratorState["set"], v: CuratorState["set"][typeof k]) => patch((cur) => ({ set: { ...cur.set, [k]: v } }));
    const onField: Record<string, (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void> = {};
    (Object.keys(s.f) as Array<keyof CuratorState["f"]>).forEach((k) => {
      onField[k] = (e) => patch((cur) => ({ f: { ...cur.f, [k]: e.target.value } }));
    });

    return {
      rootRef: rootRef as RefObject<HTMLDivElement>,
      setRef: setRef as RefObject<HTMLDivElement>,
      wide,
      isToday: s.screen === "today",
      isCompose: s.screen === "compose",
      isPublish: s.screen === "publish",
      isDone: s.screen === "done",
      isProjects: s.screen === "projects",
      isSettings: s.screen === "settings",
      showSteps: wide && ["today", "compose", "publish", "done"].includes(s.screen),
      steps,
      goProjects: () => go("projects"),
      goSettings: () => go("settings"),
      goToday: () => go("today"),
      goCompose: () => go("compose"),
      goPublish: () => go("publish"),
      inReady: s.view === "ready",
      inAside: s.view === "aside",
      tapHint: tapSelects ? "Tap a work to add it to today's feature." : "Tap a work to look closer, or tap its circle to select.",
      showTapHint: !sel.length,
      gridItems,
      asideGroups,
      slots,
      selCount: sel.length,
      hasSel: sel.length > 0,
      noSel: !sel.length,
      openSlots: 10 - sel.length,
      hasOpenSlots: sel.length < 10,
      hasDetail: !!dt,
      dt,
      closeDetail: () => patch({ detail: null }),
      detailPrev: () => navDetail(-1),
      detailNext: () => navDetail(1),
      orderItems,
      pv,
      dots,
      credits,
      pvPrev: () => sel.length && patch((cur) => ({ pIdx: (pIdx - 1 + sel.length) % sel.length })),
      pvNext: () => sel.length && patch((cur) => ({ pIdx: (pIdx + 1) % sel.length })),
      opening: s.opening,
      closing: s.closing,
      hashtags: s.hashtags,
      plainText: s.plainText,
      plain: s.plain,
      templateMode: !s.plain,
      onOpening: (e: React.ChangeEvent<HTMLTextAreaElement>) => patch({ opening: e.target.value }),
      onClosing: (e: React.ChangeEvent<HTMLTextAreaElement>) => patch({ closing: e.target.value }),
      onHashtags: (e: React.ChangeEvent<HTMLInputElement>) => patch({ hashtags: e.target.value }),
      onPlain: (e: React.ChangeEvent<HTMLTextAreaElement>) => patch({ plainText: e.target.value }),
      togglePlain: () => patch((cur) => (cur.plain ? { plain: false } : { plain: true, plainText: fullCaption(cur) })),
      plainToggleLabel: s.plain ? "Back to template" : "Edit as one text",
      capChecks,
      composeSummary,
      igCaption,
      igCollapsed,
      toggleIg: () => patch({ igOpen: true }),
      pubChecks,
      canPublish,
      blocked: !canPublish,
      publishLabel,
      publishing: s.publishing,
      notPublishing: !s.publishing,
      pubSteps,
      blockedNote: sel.length ? "The caption is over Instagram's 2,200-character limit. Shorten it in the composer." : "Add at least one work first.",
      publish: () => canPublish && publish(),
      pubModes: [
        { label: "Publish now", on: s.pubMode === "now", off: s.pubMode !== "now", hasTime: false, onClick: () => patch({ pubMode: "now" }) },
        { label: "Schedule", on: s.pubMode === "schedule", off: s.pubMode !== "schedule", hasTime: true, onClick: () => patch({ pubMode: "schedule" }) },
      ],
      pubTime: s.pubTime,
      onPubTime: (e: React.ChangeEvent<HTMLSelectElement>) => patch({ pubTime: e.target.value, pubMode: "schedule" }),
      stop: (e?: { stopPropagation?: () => void }) => stopEv(e),
      doneTitle: s.pubMode === "now" ? "Day 16 is published." : "Day 16 is scheduled.",
      doneSub: `${sel.length} creator${sel.length === 1 ? "" : "s"} featured on @creativeoctober${s.pubMode === "now" ? "" : " at " + timeLabel(s.pubTime)}, credited in slide order.`,
      doneThumbs: sel.map((id) => ({ art: makeArt(D.byId[id].kind, D.byId[id].pal, D.byId[id].seed) })),
      elapsed: s.elapsed,
      timeOpts: TIME_OPTIONS.map((label) => ({
        label,
        on: s.timeAnswer === label,
        off: s.timeAnswer !== label,
        onClick: () => {
          patch({ timeAnswer: label });
          props.onTimeAnswer?.(label);
        },
      })),
      answered: !!s.timeAnswer,
      hasCta: !!props.onCta,
      noCta: !props.onCta,
      onCta: () => props.onCta?.(),
      resetDemo,
      projectRows,
      newChallenge: () => showToast("In the product: start blank, or duplicate a past challenge."),
      dupOpen: s.dupOpen,
      dupSource: s.dupSource,
      dupName: s.dupName,
      dupItems,
      onDupName: (e: React.ChangeEvent<HTMLInputElement>) => patch({ dupName: e.target.value }),
      closeDup: () => patch({ dupOpen: false }),
      createDup: () => {
        const id = "d" + Date.now();
        patch((cur) => ({
          dupOpen: false,
          fresh: id,
          projects: [
            {
              id,
              name: cur.dupName || "Untitled challenge",
              dates: "Oct 1–31, 2027",
              status: "draft",
              note: "Rules and hashtags ready · starts Oct 1, 2027",
              seeds: [41, 42, 43, 44],
            },
            ...cur.projects,
          ],
        }));
        showToast(`${s.dupName} created as a draft`);
      },
      setNav: [
        ["general", "General"],
        ["rules", "Submission rules"],
        ["days", "Calendar"],
        ["selection", "Selection"],
        ["publishing", "Publishing"],
        ["terms", "Participation & rights"],
      ].map(([k, label]) => ({ label, onClick: () => scrollToSec(k) })),
      f: s.f,
      on: onField,
      ruleToggles: [
        { k: "mention", label: "Require @creativeoctober mention", sub: "Tag or @mention in the caption" },
        { k: "daily", label: "Require the daily hashtag", sub: "#creativeoctober2026_day16 on Day 16, from your template" },
      ].map((t) => ({
        ...t,
        on: s.set[t.k as keyof CuratorState["set"]],
        off: !s.set[t.k as keyof CuratorState["set"]],
        onClick: () => sset(t.k as keyof CuratorState["set"], !s.set[t.k as keyof CuratorState["set"]] as never),
      })),
      audioOpts: [
        ["remove", "Remove audio"],
        ["keep", "Keep audio"],
      ].map(([v, label]) => ({ label, on: s.set.audio === v, off: s.set.audio !== v, onClick: () => sset("audio", v as "remove" | "keep") })),
      mediaOpts: [
        ["image", "Images"],
        ["carousel", "Carousels"],
        ["reel", "Reels"],
      ].map(([k, label]) => ({
        label,
        on: s.set[k as keyof CuratorState["set"]],
        off: !s.set[k as keyof CuratorState["set"]],
        onClick: () => sset(k as keyof CuratorState["set"], !s.set[k as keyof CuratorState["set"]] as never),
      })),
      promptRows,
      toggleAllPrompts: () => patch({ showAllPrompts: !s.showAllPrompts }),
      allPromptsLabel: s.showAllPrompts ? "Show fewer" : "Show all 31 days",
      hasToast: !!s.toast,
      toast: s.toast,
      tabs: [
        ["ready", "Ready to curate", ready.length],
        ["aside", "Set aside", aside.length],
      ].map(([v, label, count]) => ({ label, count, on: s.view === v, off: s.view !== v, onClick: () => setView(v as "ready" | "aside") })),
      showDragHint: !s.moved && sel.length > 1,
      verifySummary,
      hasUnchecked: unchecked > 0,
      hasUnverified: canPublish && unchecked > 0,
      allClear: canPublish && !unchecked,
      unverifiedTitle: unchecked === 1 ? "1 creator hasn't been verified" : unchecked + " creators haven't been verified",
      unverifiedNames: unverifiedHandles.join(", "),
      publishAnywayLabel: s.pubMode === "now" ? "Publish anyway" : "Schedule anyway",
      tagChallengePreview: genTag(s.f.tagChallenge, s.f.tagName, 2026, 16),
      tagDailyFirst: genTag(s.f.tagDaily, s.f.tagName, 2026, 1),
      tagDailyLast: genTag(s.f.tagDaily, s.f.tagName, 2026, 31),
      dupChal: genTag(s.f.tagChallenge, s.f.tagName, 2027, 1),
      dupDay: genTag(s.f.tagDaily, s.f.tagName, 2027, 1),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, data, props, toggle, removeSel, move, go, setView, creditsFor, fullCaption, timeLabel, pubStepLabels, publish, scrollToSec, resetDemo, showToast, stopEv, patch]);

  return { ...view, eff };
}

export type CuratorViewModel = ReturnType<typeof useChallengeCurator>;
