"use client";

import { useEffect, useState } from "react";

/** Mirrors the demo's own container-width breakpoint (useChallengeCurator.ts: `wide = s.w >= 760`), measured against the viewport instead of a frame since the real app isn't rendered inside a fixed-size frame. Shared by CuratorPageShell (header layout) and anything else that needs the same breakpoint (e.g. the tray's thumbnail row) so they never disagree about whether the layout is "wide." */
export function useWideBreakpoint(): boolean {
  const [wide, setWide] = useState(true);
  useEffect(() => {
    function check() {
      setWide(window.innerWidth >= 760);
    }
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return wide;
}
