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
  Eye,
  EyeOff,
} from 'lucide-react';
import styles from './login.module.css';

function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
  };

  const handleIdentifierBlur = () => {
    if (username.includes('@') && /[A-Z]/.test(username)) {
      setCapsModal({
        isOpen: true,
        typedEmail: username,
        lowerEmail: username.toLowerCase().trim(),
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

  const handleSubmit = async (e, bypassCaps = false) => {
    if (e) e.preventDefault();
    setError('');
    setInfoMsg('');

    // Check if uppercase in email
    if (!bypassCaps && username.includes('@') && /[A-Z]/.test(username)) {
      setCapsModal({
        isOpen: true,
        typedEmail: username,
        lowerEmail: username.toLowerCase().trim(),
      });
      return;
    }

    setLoading(true);

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
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className={styles.modalTitle}>Uppercase Email Warning</h3>
                <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 700 }}>
                  AUTHENTICATION ALERT
                </span>
              </div>
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
                onClick={() => {
                  handleDismissCapsModal();
                  handleSubmit(null, true);
                }}
                className={styles.modalDismissBtn}
              >
                Keep Current
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
            Sign in to <span className={styles.redHighlight}>Shortfundly CensorAI</span>
          </h1>
          <p className={styles.subtitle}>
            Enter your studio account credentials to access regulatory compliance reports
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
        <form onSubmit={(e) => handleSubmit(e, false)} className={styles.form}>
          <div className={styles.fieldGroup}>
            <div className={styles.labelRow}>
              <label className={styles.label} style={{ marginBottom: 0 }}>Username or Email</label>
              {username.includes('@') && /[A-Z]/.test(username) && (
                <button
                  type="button"
                  onClick={() => {
                    setCapsModal({
                      isOpen: true,
                      typedEmail: username,
                      lowerEmail: username.toLowerCase().trim(),
                    });
                  }}
                  className={styles.capsIndicatorBtn}
                  title="Uppercase letters detected in email. Click to convert."
                >
                  <AlertTriangle size={11} />
                  <span>CAPS DETECTED — FIX</span>
                </button>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => handleIdentifierChange(e.target.value)}
                onBlur={handleIdentifierBlur}
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
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
                className={styles.input}
                style={{ paddingRight: '42px' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className={styles.togglePasswordBtn}
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
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
                <span>Sign In to Studio</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Switch to Register */}
        <div className={styles.footerLinks}>
          <span className={styles.footerText}>Need a studio account?</span>{' '}
          <Link href="/register" className={styles.link}>
            Create an Account
          </Link>
        </div>

        {/* Regulatory Badge */}
        <div className={styles.complianceBadge}>
          <ShieldCheck size={14} />
          <span>Encrypted Studio Session • CBFC Section 5B Audited</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.authContainer}><div className={styles.authCard}>Loading authentication...</div></div>}>
      <LoginForm />
    </Suspense>
  );
}
