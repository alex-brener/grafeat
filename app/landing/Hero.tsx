import styles from "./Hero.module.css";

export function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.eyebrow}>For organizers of recurring Instagram art challenges</div>
      <h1 className={styles.headline}>
        Great work deserves to be featured. <span className={styles.headlineAccent}>Effortlessly.</span>
      </h1>
      <div className={styles.row}>
        <p className={styles.lede}>
        Grafeat collects your challenge submissions, checks the rules, and prepares your carousel with every credit in place. You get straight to the fun part: choosing what to feature.
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
