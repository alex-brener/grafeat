import { pillars } from "./content";
import styles from "./PillarsSection.module.css";

export function PillarsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.grid}>
        {pillars.map((p) => (
          <div key={p.k} className={styles.card}>
            <span className={styles.kicker}>{p.k}</span>
            <h3 className={styles.title}>{p.title}</h3>
            <p className={styles.body}>{p.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
