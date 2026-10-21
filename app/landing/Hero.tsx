import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.eyebrow}>For organizers of recurring Instagram art challenges</div>
      <h1 className={styles.headline}>
        Great work deserves to be&nbsp;
        <br />
        <span className={styles.headlineAccent}>featured.</span>
      </h1>
      <div className={styles.row}>
        <p className={styles.lede}>
          Grafeat collects your challenge submissions, checks the rules, prepares your carousel
          and keeps every credit in order. You choose what makes the cut.
        </p>
        <div className={styles.actions}>
          <a href="#demo" className={styles.primaryCta}>
            Try the interactive demo <span>↓</span>
          </a>
          <a href="#early-access" className={styles.secondaryCta}>
            I run a challenge
          </a>
        </div>
      </div>
    </section>
  );
}
