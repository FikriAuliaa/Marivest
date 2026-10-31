import styles from "./mobile-loading.module.css";

/** Fallback untuk route dinamis: tetap berada di tengah frame ponsel. */
export function MobileLoading({ title = "Memuat MARIVEST...", description = "Menyiapkan informasi terbaru" }: {
  title?: string;
  description?: string;
}) {
  return <main className={styles.page}>
    <div className={styles.device}>
      <div className={styles.brand}>MARIVEST</div>
      <div className={styles.card} role="status" aria-live="polite">
        <span className={styles.spinner} aria-hidden="true" />
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
    </div>
  </main>;
}
