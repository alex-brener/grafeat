import { faqs } from "./content";
import styles from "./FaqSection.module.css";

export function FaqSection() {
  return (
    <section id="questions" className={styles.section}>
      <h2 className={styles.heading}>Straight answers</h2>
      <div className={styles.grid}>
        {faqs.map((item) => (
          <div key={item.q} className={styles.item}>
            <h3 className={styles.question}>{item.q}</h3>
            <p className={styles.answer}>{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
