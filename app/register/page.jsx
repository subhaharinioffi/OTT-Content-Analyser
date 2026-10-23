'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import { ShieldCheck, Lock, Mail, User, Building, ArrowRight, AlertCircle, CheckCircle, AtSign } from 'lucide-react';
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanUsername = (username || name.replace(/\s+/g, '_')).toLowerCase().trim();
    const cleanEmail = email.toLowerCase().trim();

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
                placeholder="e.g. subha_censor"
                required
                autoComplete="username"
                className={styles.input}
              />
            </div>
          </div>

          <div className={styles.fieldGroup}>
            <label className={styles.label}>Official Email</label>
            <div className={styles.inputWrapper}>
              <Mail size={16} className={styles.inputIcon} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="compliance@shortfundly.com"
                required
                autoComplete="email"
                className={styles.input}
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
            <label className={styles.label}>Password (minimum 6 characters)</label>
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
