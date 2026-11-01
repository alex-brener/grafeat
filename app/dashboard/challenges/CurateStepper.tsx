import styles from "./Challenges.module.css";

/**
 * Curate → Compose → Publish, matching the landing demo's header stepper
 * (UX-A locked decision #7). Compose/Publish are explicitly out of scope
 * for UX-A (carousel assembly, ordering, actual Instagram publishing) —
 * shown here as genuinely disabled plain text, never a styled-disabled
 * button or a link to an empty page, so nothing implies they're one click
 * away from working.
 */
export function CurateStepper() {
  return (
    <nav aria-label="Challenge workflow" className={styles.stepper}>
      <span className={`${styles.step} ${styles.step_active}`}>
        <span className={styles.stepNumber}>1</span>Curate
      </span>
      <span className={styles.stepDivider} />
      <span className={`${styles.step} ${styles.step_locked}`}>
        <span className={styles.stepNumber}>2</span>Compose
      </span>
      <span className={styles.stepDivider} />
      <span className={`${styles.step} ${styles.step_locked}`}>
        <span className={styles.stepNumber}>3</span>Publish
      </span>
    </nav>
  );
}
