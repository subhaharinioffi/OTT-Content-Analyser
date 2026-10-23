'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import styles from './ThemeToggle.module.css';

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className={styles.placeholder} />;
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className={styles.toggleBtn}
      aria-label="Toggle theme"
      title={`Switch to ${isDark ? 'Light (Studio Daylight)' : 'Dark (Dolby Cinema Obsidian)'} mode`}
    >
      <div className={`${styles.slider} ${isDark ? styles.dark : styles.light}`}>
        {isDark ? (
          <Moon size={15} className={styles.iconMoon} />
        ) : (
          <Sun size={15} className={styles.iconSun} />
        )}
      </div>
      <span className={styles.label}>{isDark ? 'Obsidian' : 'Daylight'}</span>
    </button>
  );
}
