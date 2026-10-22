import type { Metadata } from "next";
import { notFound } from "next/navigation";
import styles from "./dev.module.css";

// Defense in depth: even though nothing links here and robots.txt disallows
// it, make sure a crawler that finds the URL anyway is told not to index it.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function DevLayout({ children }: { children: React.ReactNode }) {
  // Server-side enforcement, not just hidden links: /dev is a diagnostic
  // surface for exercising live OAuth/discovery endpoints and must not be
  // reachable in Production. NODE_ENV is "production" for both `next build`
  // + `next start` and any Vercel deployment (Production or Preview), and
  // "development" only under `next dev` — exactly the local-dev case this
  // route needs to keep working.
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return <div className={styles.diagnostic}>{children}</div>;
}
