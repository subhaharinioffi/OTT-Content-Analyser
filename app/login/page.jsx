'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Sparkles } from 'lucide-react';
import styles from './login.module.css';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      if (urlError) {
        if (urlError === 'Configuration') {
          setError('Server configuration resolved. Please sign in with your credentials below.');
        } else {
          setError(urlError);
        }
      }
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('An unexpected authentication error occurred.');
      setLoading(false);
    }
  };

  const handleQuickDemo = () => {
    setEmail('demo.reviewer@cinecomply.io');
    setPassword('Compliance2026!');
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Logo and Header */}
        <div className={styles.logoHeader}>
          <div className={styles.logoCircle}>
            <Image
              src="/logo.png"
              alt="CineComply Logo"
              width={54}
              height={54}
              priority
              className={styles.logoImg}
            />
          </div>
          <h1 className={styles.title}>
            CINE<span className={styles.redHighlight}>COMPLY</span> AI
          </h1>
          <p className={styles.subtitle}>
            OTT Regulatory & Content Compliance Authentication Gateway
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Official Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="reviewer@ottstudio.com"
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Security Password</label>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                className={styles.input}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? (
              <span className={styles.loadingSpinner}>Authenticating...</span>
            ) : (
              <>
                <span>Sign In to Compliance Studio</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Quick Demo Autofill */}
        <div className={styles.demoSection}>
          <button
            type="button"
            onClick={handleQuickDemo}
            className={styles.demoBtn}
          >
            <Sparkles size={14} />
            <span>Fill Demo Reviewer Credentials</span>
          </button>
        </div>

        {/* Switch to Register */}
        <div className={styles.footerLinks}>
          <span className={styles.footerText}>New compliance officer?</span>{' '}
          <Link href="/register" className={styles.link}>
            Create an Account
          </Link>
        </div>

        {/* Regulatory Badge */}
        <div className={styles.complianceBadge}>
          <ShieldCheck size={14} />
          <span>Encrypted Session • Ministry of I&B Ethics Code Compliant</span>
        </div>
      </div>
    </div>
  );
}
