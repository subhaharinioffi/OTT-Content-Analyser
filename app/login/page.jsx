'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Lock, User, ArrowRight, AlertCircle, CheckCircle } from 'lucide-react';
import styles from './login.module.css';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const urlError = params.get('error');
      const registered = params.get('registered');
      const prefillUser = params.get('user');

      if (prefillUser) {
        setUsername(prefillUser);
      }

      if (registered) {
        setInfoMsg('Account created successfully! Please sign in with your credentials.');
      }

      if (urlError && urlError !== 'Configuration') {
        if (urlError === 'CredentialsSignin') {
          setError('Incorrect username/email or password. Please verify your credentials.');
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
    setInfoMsg('');

    try {
      const trimmedIdentifier = username.trim();
      const res = await signIn('credentials', {
        username: trimmedIdentifier,
        email: trimmedIdentifier,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (res?.error) {
        if (res.error === 'CredentialsSignin') {
          setError('Incorrect username/email or password. Please verify your credentials.');
        } else if (res.error === 'Configuration') {
          setError('Connecting to authentication service. Please click Sign In again.');
        } else {
          setError(res.error);
        }
        setLoading(false);
      } else {
        // Successful login: Direct origin navigation guarantees session cookie persistence on mobile
        let destination = '/';
        if (typeof window !== 'undefined') {
          const params = new URLSearchParams(window.location.search);
          const callbackParam = params.get('callbackUrl');
          if (callbackParam && callbackParam.startsWith('/') && !callbackParam.startsWith('//')) {
            destination = callbackParam;
          }
        }
        window.location.href = destination;
      }
    } catch (err) {
      console.error('[Login Error]', err);
      setError(err?.message || 'An unexpected authentication error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.authContainer}>
      <div className={styles.authCard}>
        {/* Logo and Header */}
        <div className={styles.logoHeader}>
          <div className={styles.logoCircle}>
            <Image
              src="/logo.png"
              alt="Shortfundly Logo"
              width={54}
              height={54}
              priority
              className={styles.logoImg}
            />
          </div>
          <h1 className={styles.title}>
            SHORTFUNDLY <span className={styles.redHighlight}>CensorAI</span>
          </h1>
          <p className={styles.subtitle}>
            OTT Regulatory & Content Compliance Authentication Gateway
          </p>
        </div>

        {/* Info / Success Alert */}
        {infoMsg && (
          <div className={styles.successAlert}>
            <CheckCircle size={16} />
            <span>{infoMsg}</span>
          </div>
        )}

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
            <label className={styles.label}>Username or Email</label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username or email"
                required
                autoComplete="username"
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
                autoComplete="current-password"
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

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.authContainer} />}>
      <LoginForm />
    </Suspense>
  );
}
