"use client";

import { curatorFontVariables } from "./curatorFonts";
import { useChallengeCurator, type ChallengeCuratorProps } from "./useChallengeCurator";
import { CuratorHeader } from "./CuratorHeader";
import { TodayScreen } from "./TodayScreen";
import { ComposeScreen } from "./ComposeScreen";
import { PublishScreen } from "./PublishScreen";
import { DoneScreen } from "./DoneScreen";
import { ProjectsScreen } from "./ProjectsScreen";
import { SettingsScreen } from "./SettingsScreen";
import { DetailOverlay } from "./DetailOverlay";
import { DuplicateModal } from "./DuplicateModal";
import { ToastBubble } from "./ToastBubble";

/**
 * Faithful React port of Challenge Curator.dc.html — the product prototype
 * the Grafeat landing page embeds as its LIVE DEMO. Front-end simulation
 * only: no Instagram/Meta API, OAuth, webhook, discovery or publishing
 * calls, and no persistence — exactly like the source, which states
 * "Demo only: nothing is posted to Instagram."
 */
export function ChallengeCurator(props: ChallengeCuratorProps) {
  const v = useChallengeCurator(props);

  return (
    <div
      ref={v.rootRef}
      className={curatorFontVariables}
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        background: "#F4F1EA",
        color: "#1D1C18",
        fontFamily: "var(--font-sans)",
        fontSize: 14,
        lineHeight: 1.45,
        overflow: "hidden",
      }}
    >
      <CuratorHeader v={v} />
      <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
        {v.isToday && <TodayScreen v={v} />}
        {v.isCompose && <ComposeScreen v={v} />}
        {v.isPublish && <PublishScreen v={v} />}
        {v.isDone && <DoneScreen v={v} />}
        {v.isProjects && <ProjectsScreen v={v} />}
        {v.isSettings && <SettingsScreen v={v} />}
      </div>
      <DetailOverlay v={v} />
      <DuplicateModal v={v} />
      <ToastBubble v={v} />
    </div>
  );
}
