import Navbar from "@/components/Navbar/Navbar";
import MovieGrid from "@/components/MovieGrid/MovieGrid";
import { getTrending } from "@/lib/tmdb";
import styles from "../page.module.css";

export default async function TrendingPage() {
  const trending = await getTrending();

  return (
    <main className={styles.main}>
      <Navbar />
      
      <div className={styles.pageContent}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Trending Now</h2>
          <p style={{ color: 'var(--foreground-muted)', marginTop: '10px' }}>
            The most popular movies and shows on TMDb today.
          </p>
          <div className={styles.divider}></div>
        </div>
        
        <MovieGrid movies={trending} />
      </div>

      <footer className={styles.footer}>
        <p>&copy; 2024 CineVault. Powered by TMDb API.</p>
      </footer>
    </main>
  );
}
