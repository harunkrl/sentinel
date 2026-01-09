import Link from 'next/link'
import styles from './docs.module.css'

export default function DocsLayout({ children }) {
    return (
        <div className={styles.container}>
            <aside className={styles.sidebar}>
                <div className={styles.sidebarTitle}>Documentation</div>
                <nav className={styles.nav}>
                    <Link href="/docs" className={styles.activeLink}>Architecture</Link>
                    <Link href="#" className={styles.navLink}>Getting Started</Link>
                    <Link href="#" className={styles.navLink}>Configuration</Link>
                    <Link href="#" className={styles.navLink}>API Reference</Link>
                    <div style={{ marginTop: '1rem', borderTop: '1px solid var(--card-border)', paddingTop: '1rem' }}>
                        <Link href="/" className={styles.navLink}>← Back to Home</Link>
                    </div>
                </nav>
            </aside>
            <main className={styles.content}>
                {children}
            </main>
        </div>
    )
}
