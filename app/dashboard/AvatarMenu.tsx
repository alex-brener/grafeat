"use client";

import { useEffect, useRef, useState } from "react";
import { SignOutButton } from "./SignOutButton";

function initialsFor(email: string): string {
  const name = email.split("@")[0] ?? email;
  const parts = name.split(/[._-]/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * The demo's header avatar is a static decorative circle — the real app
 * needs an actual sign-out affordance somewhere, and there's no demo
 * equivalent to extract (UX-A visual-parity decision: avatar becomes a
 * dropdown). Click/Escape/outside-click all close it.
 */
export function AvatarMenu({ email }: { email: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title={email}
        style={{
          width: 30,
          height: 30,
          flex: "none",
          borderRadius: "50%",
          background: "#5C6127",
          color: "#F4F1EA",
          fontSize: 11,
          fontWeight: 700,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          letterSpacing: "0.02em",
          border: "none",
          cursor: "pointer",
        }}
      >
        {initialsFor(email)}
      </button>
      {open && (
        <div
          role="menu"
          style={{
            position: "absolute",
            right: 0,
            top: 38,
            zIndex: 250,
            minWidth: 200,
            background: "#FBFAF6",
            border: "1px solid #E2DDD1",
            borderRadius: 8,
            boxShadow: "0 10px 30px rgba(0,0,0,.12)",
            padding: 10,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12.5, color: "#5E5A50", padding: "2px 4px", wordBreak: "break-all" }}>{email}</span>
          <SignOutButton />
        </div>
      )}
    </div>
  );
}
