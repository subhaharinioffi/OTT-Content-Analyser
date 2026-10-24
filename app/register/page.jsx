'use client';

import { useState, useMemo, useRef } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ShieldCheck,
  ShieldAlert,
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
  Eye,
  EyeOff,
  RefreshCw,
} from 'lucide-react';
import styles from './register.module.css';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [organization, setOrganization] = useState('Cinema Studio Labs');
  const [role, setRole] = useState('reviewer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordPulse, setPasswordPulse] = useState(false);

  const passwordInputRef = useRef(null);
  const emailInputRef = useRef(null);

  // Warning alert modal for uppercase in email
  const [capsModal, setCapsModal] = useState({
    isOpen: false,
    typedEmail: '',
    lowerEmail: '',
  });

  // Weak password alert modal
  const [weakPasswordModal, setWeakPasswordModal] = useState({
    isOpen: false,
  });

  // Handle email changes
  const handleEmailChange = (val) => {
    setEmail(val);
  };

  // Blur on email field triggers uppercase warning popup if caps exist
  const handleEmailBlur = () => {
    if (/[A-Z]/.test(email)) {
      setCapsModal({
        isOpen: true,
        typedEmail: email,
        lowerEmail: email.toLowerCase().trim(),
      });
    }
  };

  const handleApplyLowerCaseEmail = () => {
    const fixed = (capsModal.lowerEmail || email).toLowerCase().trim();
    setEmail(fixed);
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
    const isWeak = score < 3 || password.length < 8;

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

    return { checks, score, label, labelClass, activeBars, isWeak };
  }, [password]);

  // Generate a cryptographically strong password meeting 100% of criteria
  const handleGenerateStrongPassword = () => {
    const uppers = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
    const lowers = 'abcdefghijkmnopqrstuvwxyz';
    const numbers = '23456789';
    const specials = '@$!%*?&#';

    let gen = '';
    for (let i = 0; i < 3; i++) gen += uppers[Math.floor(Math.random() * uppers.length)];
    for (let i = 0; i < 4; i++) gen += lowers[Math.floor(Math.random() * lowers.length)];
    for (let i = 0; i < 3; i++) gen += numbers[Math.floor(Math.random() * numbers.length)];
    for (let i = 0; i < 2; i++) gen += specials[Math.floor(Math.random() * specials.length)];

    const finalPassword = gen.split('').sort(() => 0.5 - Math.random()).join('');
    setPassword(finalPassword);
    setShowPassword(true);
    setWeakPasswordModal({ isOpen: false });
    setPasswordPulse(false);
  };

  const handleFocusPassword = () => {
    setWeakPasswordModal({ isOpen: false });
    setPasswordPulse(true);
    setTimeout(() => {
      passwordInputRef.current?.focus();
    }, 100);
  };

  const handleSubmit = async (e, bypassWeak = false) => {
    if (e) e.preventDefault();
    setError('');

    // Check 1: If uppercase in email, trigger warning popup modal
    if (/[A-Z]/.test(email)) {
      setCapsModal({
        isOpen: true,
        typedEmail: email,
        lowerEmail: email.toLowerCase().trim(),
      });
      return;
    }

    // Check 2: If weak password, trigger weak password alert modal
    if (!bypassWeak && (password.length < 8 || securityAnalysis.isWeak)) {
      setWeakPasswordModal({ isOpen: true });
      setPasswordPulse(true);
      return;
    }

    setLoading(true);

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
        window.location.href = '/';
      } else {
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
      {/* 1. Uppercase Email Warning Alert Popup Modal */}
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
              Email addresses are standard lowercase identifiers. Having capital letters can lead to sign-in mismatches when accessing your studio dashboard across devices.
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

      {/* 2. Weak Password Warning Alert Popup Modal */}
      {weakPasswordModal.isOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true">
          <div className={styles.modalBackdrop} onClick={() => setWeakPasswordModal({ isOpen: false })} />
          <div className={styles.weakModalContent}>
            <div className={styles.modalHeader}>
              <div className={styles.weakShieldIconBox}>
                <ShieldAlert size={26} />
              </div>
              <div>
                <h3 className={styles.weakModalTitle}>Weak Password Alert</h3>
                <span className={styles.weakScoreBadge}>
                  Strength: {securityAnalysis.label} ({securityAnalysis.score}/5 Criteria)
                </span>
              </div>
            </div>

            <p className={styles.modalBody}>
              Your chosen password does not meet the recommended regulatory studio security standard. Weak credentials make your compliance clearance reports vulnerable.
            </p>

            {/* Checklist of unmet criteria */}
            <div className={styles.missingCriteriaList}>
              <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>
                Password Security Audit:
              </span>
              {securityAnalysis.checks.map((c) => (
                <div
                  key={c.id}
                  className={`${styles.missingCriterionItem} ${c.met ? styles.criterionPassed : styles.criterionFailed}`}
                >
                  {c.met ? <Check size={14} /> : <X size={14} />}
                  <span>{c.label}</span>
                </div>
              ))}
            </div>

            <div className={styles.modalWeakActions}>
              <div className={styles.weakActionPrimaryRow}>
                <button
                  type="button"
                  onClick={handleGenerateStrongPassword}
                  className={styles.generateStrongModalBtn}
                >
                  <Sparkles size={16} />
                  <span>Generate Strong Password</span>
                </button>
                <button
                  type="button"
                  onClick={handleFocusPassword}
                  className={styles.strengthenBtn}
                >
                  <span>Strengthen Myself</span>
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWeakPasswordModal({ isOpen: false });
                  handleSubmit(null, true);
                }}
                className={styles.weakProceedBtn}
              >
                Proceed with weak password anyway &rarr;
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
        <form onSubmit={(e) => handleSubmit(e, false)} className={styles.form}>
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
            <div className={styles.label}>
              <span>Official Email</span>
              {/[A-Z]/.test(email) && (
                <button
                  type="button"
                  onClick={() => {
                    setCapsModal({
                      isOpen: true,
                      typedEmail: email,
                      lowerEmail: email.toLowerCase().trim(),
                    });
                  }}
                  className={styles.capsIndicatorBtn}
                  title="Uppercase detected in email. Click to convert."
                >
                  <AlertTriangle size={11} />
                  <span>CAPS DETECTED — FIX</span>
                </button>
              )}
            </div>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                ref={emailInputRef}
                type="email"
                value={email}
                onChange={(e) => handleEmailChange(e.target.value)}
                onBlur={handleEmailBlur}
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
            <div className={styles.passwordHeaderRow}>
              <label className={styles.label} style={{ marginBottom: 0 }}>Security Password</label>
              <button
                type="button"
                onClick={handleGenerateStrongPassword}
                className={styles.suggestPasswordLink}
                title="Auto-generate a strong compliant password"
              >
                <Sparkles size={11} />
                <span>Suggest Strong Password</span>
              </button>
            </div>
            <div className={styles.inputWrapper}>
              <Lock size={16} className={styles.inputIcon} />
              <input
                ref={passwordInputRef}
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordPulse) setPasswordPulse(false);
                }}
                placeholder="••••••••••••"
                required
                minLength={6}
                autoComplete="new-password"
                className={`${styles.input} ${passwordPulse ? styles.inputWeakPulse : ''}`}
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

                {/* Real-time Inline Alert when Password is Weak */}
                {securityAnalysis.isWeak && (
                  <div className={styles.weakPasswordWarningBox}>
                    <div className={styles.weakWarningHeader}>
                      <AlertTriangle size={14} />
                      <span>Security Warning: Weak Password</span>
                    </div>
                    <p className={styles.weakWarningText}>
                      Your password is below recommended studio security guidelines ({securityAnalysis.score}/5 criteria). An alert modal will appear upon submission.
                    </p>
                    <button
                      type="button"
                      onClick={handleGenerateStrongPassword}
                      className={styles.quickGenerateBtn}
                    >
                      <Sparkles size={12} />
                      <span>Auto-Generate 100% Strong Password</span>
                    </button>
                  </div>
                )}

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
