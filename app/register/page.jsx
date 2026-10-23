'use client';

import { useState, useMemo } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  Lock,
  Mail,
  User,
  Building,
  ArrowRight,
  AlertCircle,
  CheckCircle,
  AtSign,
  AlertTriangle,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import styles from './register.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [organization, setOrganization] = useState('Cinema Studio Labs');
  const [role, setRole] = useState('reviewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Warning alert modal for uppercase in email
  const [capsModal, setCapsModal] = useState({
    isOpen: false,
    typedEmail: '',
    lowerEmail: '',
  });

  // Handle email changes and check for caps
  const handleEmailChange = (val) => {
    setEmail(val);
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
    setEmail(capsModal.lowerEmail);
    setCapsModal({ isOpen: false, typedEmail: '', lowerEmail: '' });
  };

  const handleDismissCapsModal = () => {
    setCapsModal({ isOpen: false, typedEmail: '', lowerEmail: '' });
  };

  // Password Security Analysis & Suggestions
  const securityAnalysis = useMemo(() => {
    const checks = [
      { id: 'len', label: 'At least 8 characters', met: password.length >= 8 },
      { id: 'upper', label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
      { id: 'lower', label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
      { id: 'num', label: 'Number (0-9)', met: /[0-9]/.test(password) },
      { id: 'special', label: 'Special symbol (@$!%*?&#)', met: /[^A-Za-z0-9]/.test(password) },
    ];

    const score = checks.filter((c) => c.met).length;
    let label = 'Weak';
    let labelClass = styles.strengthWeak;
    let activeBars = 1;

    if (score >= 4) {
      label = 'Strong (Recommended)';
      labelClass = styles.strengthStrong;
      activeBars = 4;
    } else if (score >= 3) {
      label = 'Good';
      labelClass = styles.strengthGood;
      activeBars = 3;
    } else if (score >= 2) {
      label = 'Fair';
      labelClass = styles.strengthFair;
      activeBars = 2;
    }

    return { checks, score, label, labelClass, activeBars };
  }, [password]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Ensure email is strictly lowercased and trimmed
    const cleanEmail = email.toLowerCase().trim();
    const cleanUsername = (username || name.replace(/\s+/g, '_')).toLowerCase().trim();

    if (!cleanUsername) {
      setError('Please choose a valid username.');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          username: cleanUsername,
          email: cleanEmail,
          password,
          organization: organization.trim(),
          role,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to create account.');
        setLoading(false);
        return;
      }

      setSuccess(true);

      // Automatically sign in with credentials
      const loginRes = await signIn('credentials', {
        username: cleanUsername,
        email: cleanEmail,
        password,
        redirect: false,
        callbackUrl: '/',
      });

      if (!loginRes?.error) {
        // Direct origin navigation ensures session cookies are recognized on mobile browsers
        window.location.href = '/';
      } else {
        // If automatic login experienced a transient mobile token delay, redirect to login with prefill
        window.location.href = `/login?registered=true&user=${encodeURIComponent(cleanUsername || cleanEmail)}`;
      }
    } catch (err) {
      console.error('[Register Error]', err);
      setError('An unexpected error occurred during registration. Please try again.');
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
              Email addresses are case-insensitive standard identifiers, but uppercase letters can lead to sign-in mismatches when typing quickly on mobile devices.
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
            Join <span className={styles.redHighlight}>Shortfundly CensorAI</span>
          </h1>
          <p className={styles.subtitle}>
            Register your studio credentials for automated OTT regulatory clearance
          </p>
        </div>

        {/* Error / Success Alerts */}
        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className={styles.successAlert}>
            <CheckCircle size={16} />
            <span>Account created! Entering studio workspace...</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Full Name</label>
            <div className={styles.inputWrapper}>
              <User size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Subhaharini S"
                required
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Username</label>
            <div className={styles.inputWrapper}>
              <AtSign size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ''))}
                placeholder="e.g. subha_04"
                required
                autoComplete="username"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>
              <span>Official Email</span>
              {/[A-Z]/.test(email) && <span className={styles.capsIndicator}>CAPS DETECTED</span>}
            </label>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                placeholder="compliance@shortfundly.com"
                required
                autoComplete="email"
                className={`${styles.input} ${/[A-Z]/.test(email) ? styles.inputWarning : ''}`}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Studio Organization</label>
            <div className={styles.inputWrapper}>
              <Building size={16} className={styles.inputIcon} />
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="e.g. Prime Cinema Labs"
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
                minLength={6}
                autoComplete="new-password"
                className={styles.input}
              />
            </div>

            {/* Password Security Meter & Suggestions */}
            {password.length > 0 && (
              <div className={styles.securityMeterWrapper}>
                <div className={styles.strengthBarContainer}>
                  {[1, 2, 3, 4].map((step) => {
                    const isActive = step <= securityAnalysis.activeBars;
                    let barColor = 'rgba(255, 255, 255, 0.1)';
                    if (isActive) {
                      if (securityAnalysis.activeBars === 1) barColor = '#ef4444';
                      else if (securityAnalysis.activeBars === 2) barColor = '#f59e0b';
                      else if (securityAnalysis.activeBars === 3) barColor = '#38bdf8';
                      else barColor = '#10b981';
                    }
                    return (
                      <div
                        key={step}
                        className={styles.strengthBarStep}
                        style={{ backgroundColor: barColor }}
                      />
                    );
                  })}
                </div>

                <div className={styles.strengthMeta}>
                  <span className={styles.strengthLabel}>
                    Security Strength: <span className={securityAnalysis.labelClass}>{securityAnalysis.label}</span>
                  </span>
                  <span>{securityAnalysis.score}/5 Criteria</span>
                </div>

                {/* Suggestions Checklist */}
                <div className={styles.suggestionsList}>
                  {securityAnalysis.checks.map((c) => (
                    <div
                      key={c.id}
                      className={`${styles.suggestionItem} ${c.met ? styles.suggestionMet : ''}`}
                    >
                      {c.met ? <Check size={12} /> : <X size={12} />}
                      <span>{c.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={styles.submitBtn}
          >
            {loading ? (
              <span className={styles.loadingSpinner}>Creating Account...</span>
            ) : (
              <>
                <span>Complete Registration</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </form>

        {/* Switch to Login */}
        <div className={styles.footerLinks}>
          <span className={styles.footerText}>Already registered?</span>{' '}
          <Link href="/login" className={styles.link}>
            Sign In with Username / Password
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
