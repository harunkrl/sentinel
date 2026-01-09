import Image from 'next/image'
import styles from './page.module.css'
import Link from 'next/link'

export default function Home() {
  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <h1 className={styles.title}>
          Monitor Infrastructure<br />
          Without the Noise
        </h1>
        <p className={styles.subtitle}>
          Sentinel provides real-time insights into your system performance.
          Self-hosted, secure, and built for modern DevOps teams.
        </p>
        <div className={styles.ctaGroup}>
          <Link href="/docs" className={styles.primaryButton}>
            Get Started
          </Link>
          <a href="https://github.com/esprimo/Sentinel" target="_blank" rel="noopener noreferrer" className={styles.secondaryButton}>
            View Source
          </a>
        </div>
      </section>

      <section className={styles.featuresInfo}>
        <h2 className={styles.sectionTitle}>Why Sentinel?</h2>
        <div className={styles.grid}>
          <div className={styles.card}>
            <h3>Real-time Metrics</h3>
            <p>
              Instantly see CPU, Memory, and Disk I/O across all your nodes.
              Latency is a thing of the past.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Agent-Based</h3>
            <p>
              Lightweight Go agents run on your servers with minimal footprint,
              pushing data securely to your central hub.
            </p>
          </div>

          <div className={styles.card}>
            <h3>Self-Hosted Control</h3>
            <p>
              Your data stays with you. Deploy Sentinel on your own infrastructure
              and maintain full privacy compliance.
            </p>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Sentinel Project. Built by Esprimo.</p>
      </footer>
    </main>
  )
}
