'use client';

import { useState, useEffect, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import styles from './login.module.css';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Warning alert modal for uppercase in email
  const [capsModal, setCapsModal] = useState({
    isOpen: false,
    typedEmail: '',
    lowerEmail: '',
  });

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

  const handleIdentifierChange = (val) => {
    setUsername(val);
    const hasUpperCase = /[A-Z]/.test(val);
    if (hasUpperCase && val.includes('@') && !capsModal.isOpen) {
      setCapsModal({
        isOpen: true,
        typedEmail: val,
        lowerEmail: val.toLowerCase().trim(),
      });
    }
  };

  const handleApplyLowerCaseEmail = () => {
    setUsername(capsModal.lowerEmail);
    setCapsModal({ isOpen: false, typedEmail: '', lowerEmail: '' });
  };

  const handleDismissCapsModal = () => {
    setCapsModal({ isOpen: false, typedEmail: '', lowerEmail: '' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setInfoMsg('');

    try {
      // Normalize identifier (handles case insensitivity for emails and usernames)
      const trimmedIdentifier = username.trim();
      const normalizedIdentifier = trimmedIdentifier.includes('@')
        ? trimmedIdentifier.toLowerCase()
        : trimmedIdentifier;

      const res = await signIn('credentials', {
        username: normalizedIdentifier,
        email: normalizedIdentifier,
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
      {/* Uppercase Email Warning Alert Popup Modal */}
      {capsModal.isOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={handleDismissCapsModal} />
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.warningIconBox}>
                <AlertTriangle size={22} />
              </div>
              <h3 className={styles.modalTitle}>Uppercase Email Warning</h3>
            </div>
            <p className={styles.modalBody}>
              Email addresses are registered in lowercase. Capital letters can prevent an exact match on some mobile keyboards.
              <span className={styles.modalEmailPreview}>
                <span className={styles.emailCapsTyped}>{capsModal.typedEmail}</span>
                <span className={styles.emailLowerConverted}>&rarr; {capsModal.lowerEmail}</span>
              </span>
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={handleDismissCapsModal}
                className={styles.modalDismissBtn}
              >
                Keep As Is
              </button>
              <button
                type="button"
                onClick={handleApplyLowerCaseEmail}
                className={styles.modalPrimaryBtn}
              >
                <Sparkles size={14} />
                <span>Convert to Lowercase</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
            <label className={styles.label}>
              <span>Username or Email</span>
              {username.includes('@') && /[A-Z]/.test(username) && (
                <span className={styles.capsIndicator}>CAPS DETECTED</span>
              )}
            </label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                placeholder="Enter username or email"
                required
                autoComplete="username"
                className={`${styles.input} ${username.includes('@') && /[A-Z]/.test(username) ? styles.inputWarning : ''}`}
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
