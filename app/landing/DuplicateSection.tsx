import { carry } from "./content";
import styles from "./DuplicateSection.module.css";

export function DuplicateSection() {
  return (
    <section className={styles.section}>
      <div className={styles.intro}>
        <h2 className={styles.heading}>Next October starts from this one.</h2>
        <p className={styles.body}>
          Duplicate a finished challenge and the rules, hashtag templates, caption template and
          publishing defaults come with it. The templates fill in the new year, so there&apos;s
          nothing to retype. Submissions and features stay with the old one.
        </p>
      </div>
      <div className={styles.card}>
        <div className={styles.cardRow}>
          <span className={styles.challengeName}>Creative October 2026</span>
          <span className={styles.statusCompleted}>Completed</span>
        </div>
        <div className={styles.duplicateRow}>
          <span className={styles.duplicateArrow}>↓</span> Duplicate
        </div>
        <div className={styles.cardRowTight}>
          <span className={styles.challengeName}>Creative October 2027</span>
          <span className={styles.statusDraft}>Draft</span>
        </div>
        {carry.map((c) => (
          <div key={c.a} className={styles.carryRow}>
            <span className={styles.carryCheck}>✓</span>
            <span className={styles.carryLabel}>{c.a}</span>
            <span className={styles.carryDetail}>{c.b}</span>
          </div>
        ))}
        <div className={styles.hashtagRow}>
          #creativeoctober2026_day16 → #creativeoctober2027_day16
        </div>
      </div>
    </section>
  );
}
