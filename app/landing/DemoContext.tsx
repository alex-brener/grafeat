"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";

export interface DemoResult {
  count: number;
  seconds: number;
}

interface LandingDemoContextValue {
  expanded: boolean;
  demoDone: DemoResult | null;
  timeAnswer: string | null;
  frameRef: RefObject<HTMLDivElement>;
  formRef: RefObject<HTMLElement>;
  expand: () => void;
  collapse: () => void;
  /** Collapses full screen (if open) and smooth-scrolls to the signup form — mirrors the source's `toForm()`. */
  toForm: () => void;
  setDemoDone: (result: DemoResult) => void;
  setTimeAnswer: (label: string) => void;
}

const LandingDemoContext = createContext<LandingDemoContextValue | null>(null);

export function useLandingDemo(): LandingDemoContextValue {
  const ctx = useContext(LandingDemoContext);
  if (!ctx) throw new Error("useLandingDemo must be used within LandingDemoProvider");
  return ctx;
}

export function LandingDemoProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const [demoDone, setDemoDoneState] = useState<DemoResult | null>(null);
  const [timeAnswer, setTimeAnswerState] = useState<string | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLElement>(null);

  const collapse = useCallback(() => setExpanded(false), []);
  const expand = useCallback(() => setExpanded(true), []);

  // Mirrors the source's onKey/body-scroll-lock side effects of expand()/collapse().
  useEffect(() => {
    if (!expanded) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExpanded(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [expanded]);

  const toForm = useCallback(() => {
    setExpanded(false);
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 30);
  }, []);

  const setDemoDone = useCallback((result: DemoResult) => setDemoDoneState(result), []);
  const setTimeAnswer = useCallback((label: string) => setTimeAnswerState(label), []);

  return (
    <LandingDemoContext.Provider
      value={{
        expanded,
        demoDone,
        timeAnswer,
        frameRef,
        formRef,
        expand,
        collapse,
        toForm,
        setDemoDone,
        setTimeAnswer,
      }}
    >
      {children}
    </LandingDemoContext.Provider>
  );
}
