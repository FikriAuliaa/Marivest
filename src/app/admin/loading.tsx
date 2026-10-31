import styles from "./loading.module.css";

const metricCards = [0, 1, 2, 3];

export default function AdminLoading() {
  return (
    <main
      className={styles.shell}
      aria-label="Memuat dashboard Admin"
      aria-busy="true"
    >
      <aside className={styles.sidebar} aria-hidden="true">
        <div className={styles.brand}>M</div>
        <div className={styles.navList}>
          {Array.from({ length: 8 }, (_, index) => (
            <span className={styles.navItem} key={index} />
          ))}
        </div>
        <div className={styles.profileMark} />
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar} aria-hidden="true">
          <div className={styles.breadcrumb}>
            <span className={styles.shortLine} />
            <span className={styles.crumbLine} />
          </div>
          <div className={styles.topActions}>
            <span className={styles.searchBar} />
            <span className={styles.actionCircle} />
            <span className={styles.actionCircle} />
          </div>
        </header>

        <section className={styles.content} aria-hidden="true">
          <div className={styles.intro}>
            <div className={styles.introCopy}>
              <span className={styles.eyebrow} />
              <span className={styles.pageTitle} />
              <span className={styles.subtitle} />
            </div>
            <span className={styles.primaryAction} />
          </div>

          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow} />
            <span className={styles.sectionTitle} />
          </div>

          <div className={styles.metrics}>
            {metricCards.map((item) => (
              <article className={styles.metricCard} key={item}>
                <span className={styles.metricIcon} />
                <span className={styles.metricLabel} />
                <span className={styles.metricValue} />
                <span className={styles.metricFootnote} />
                <span className={styles.miniBars} />
              </article>
            ))}
          </div>

          <div className={styles.panels}>
            <section className={styles.chartCard}>
              <div className={styles.cardHeading}>
                <span className={styles.sectionEyebrow} />
                <span className={styles.cardTitle} />
                <span className={styles.subtitle} />
              </div>
              <div className={styles.chartArea}>
                <span className={styles.chartGridLine} />
                <span className={styles.chartGridLine} />
                <span className={styles.chartGridLine} />
                <span className={styles.chartLine} />
              </div>
              <div className={styles.chartLabels}>
                <span /><span /><span /><span /><span />
              </div>
            </section>

            <section className={styles.statusCard}>
              <div className={styles.cardHeading}>
                <span className={styles.sectionEyebrow} />
                <span className={styles.cardTitle} />
                <span className={styles.subtitle} />
              </div>
              <div className={styles.donut} />
              <div className={styles.legend}>
                <span /><span /><span />
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
