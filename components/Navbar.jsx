'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { ShieldCheck, UploadCloud, LayoutDashboard, LogOut, User } from 'lucide-react';
import ThemeToggle from './ThemeToggle';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const isAuthPage = pathname === '/login' || pathname === '/register';

  return (
    <header className={styles.navbar}>
      <div className={styles.navContainer}>
        {/* Brand identity with Logo */}
        <Link href="/" className={styles.brandLink}>
          <div className={styles.logoWrapper}>
            <Image
              src="/logo.png"
              alt="OTT Compliance Logo"
              width={34}
              height={34}
              priority
              className={styles.logoImg}
            />
          </div>
          <div className={styles.brandText}>
            <span className={styles.brandTitle}>
              CINE<span className={styles.brandRed}>COMPLY</span>
            </span>
            <span className={styles.brandSubtitle}>OTT REGULATORY AI</span>
          </div>
        </Link>

        {/* Navigation links */}
        {!isAuthPage && (
          <nav className={styles.navLinks}>
            <Link
              href="/"
              className={`${styles.navItem} ${pathname === '/' || pathname === '/dashboard' ? styles.active : ''}`}
            >
              <LayoutDashboard size={16} />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/submit"
              className={`${styles.navItem} ${pathname === '/submit' ? styles.active : ''}`}
            >
              <UploadCloud size={16} />
              <span>Upload Studio</span>
            </Link>
          </nav>
        )}

        {/* Right Actions: Theme Toggle + User Status */}
        <div className={styles.rightActions}>
          <div className={styles.badgeRegulated}>
            <ShieldCheck size={14} className={styles.shieldIcon} />
            <span className={styles.badgeText}>CBFC & OTT 2021 Compliant</span>
          </div>

          <ThemeToggle />

          {session?.user ? (
            <div className={styles.userProfile}>
              <div className={styles.userAvatar}>
                <User size={15} />
              </div>
              <div className={styles.userInfo}>
                <span className={styles.userName}>{session.user.name || 'Reviewer'}</span>
                <span className={styles.userRole}>{session.user.role || 'Compliance'}</span>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className={styles.logoutBtn}
                title="Sign Out"
                aria-label="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            !isAuthPage && (
              <Link href="/login" className={styles.loginBtn}>
                Sign In
              </Link>
            )
          )}
        </div>
      </div>
    </header>
  );
}
