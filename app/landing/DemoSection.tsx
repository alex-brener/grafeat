"use client";

import { useLandingDemo } from "./DemoContext";
import { ChallengeCurator } from "./curator/ChallengeCurator";
import styles from "./DemoSection.module.css";

function formatDemoDoneText(count: number, seconds: number): string {
  const time = seconds < 60 ? `${seconds} seconds` : `${Math.round(seconds / 60)} min`;
  return `You featured ${count} creators in ${time}. Try it with your challenge →`;
}

export function DemoSection() {
  const { expanded, expand, collapse, frameRef, demoDone, setDemoDone, setTimeAnswer, toForm } = useLandingDemo();

  return (
    <>
      <section id="demo" className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarText}>
              <span className={styles.eyebrow}>Live demo · no sign-up</span>
              <span className={styles.headline}>
                You run Creative October. It&apos;s Day 16, and 184 posts came in.
              </span>
            </div>
            <div className={styles.spacer} />
            <button type="button" onClick={expand} className={styles.fullscreenButton}>
              Full screen ⤢
            </button>
          </div>

          <div
            ref={frameRef}
            className={`${styles.frame} ${expanded ? styles.frameExpanded : ""}`}
          >
            <ChallengeCurator onPublished={setDemoDone} onCta={toForm} onTimeAnswer={setTimeAnswer} />
          </div>

          <div className={styles.caption}>
            <span>
              Sample challenge with 184 submissions. Artwork is placeholder; nothing connects to
              Instagram.
            </span>
            {demoDone ? (
              <a href="#early-access" className={styles.doneLink}>
                {formatDemoDoneText(demoDone.count, demoDone.seconds)}
              </a>
            ) : (
              <span>Also in the demo: Settings, and duplicating a challenge under the project name.</span>
            )}
          </div>
        </div>
      </section>

      {expanded && (
        <div className={styles.exitBar}>
          <span>Challenge Curator · demo</span>
          <button type="button" onClick={collapse} className={styles.exitButton}>
            Exit full screen
          </button>
        </div>
      )}
    </>
  );
}
