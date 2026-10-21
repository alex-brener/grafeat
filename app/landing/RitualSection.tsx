import { ritual } from "./content";
import styles from "./RitualSection.module.css";

export function RitualSection() {
  return (
    <section id="how" className={styles.section}>
      <div className={styles.intro}>
        <div className={styles.eyebrow}>Collect → Validate → Curate → Credit → Publish</div>
        <h2 className={styles.heading}>The same ritual, every day of the challenge.</h2>
        <p className={styles.body}>
          Ten steps, thirty-one times. Grafeat takes the bookkeeping and leaves you the judgment:
          which work you love, and the order it&apos;s shown in.
        </p>
      </div>
      <ol className={styles.list}>
        {ritual.map((r) => (
          <li key={r.n} className={styles.item}>
            <span className={styles.index}>{r.n}</span>
            <div className={styles.itemBody}>
              <span className={styles.itemStep}>{r.step}</span>
              <span className={styles.itemHow}>{r.how}</span>
            </div>
            {r.auto && <span className={styles.badgeAuto}>Automatic</span>}
            {r.you && <span className={styles.badgeYou}>You</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
