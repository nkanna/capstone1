import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { api, errorMessage } from '../lib/api';
import { BrandLogo } from '../components/BrandLogo';
import { PasswordRecoveryDialog } from '../components/PasswordRecoveryDialog';
import { LoadingScreen } from '../components/LoadingScreen';
import './auth-recovery.css';

export function AuthPage({ mode }: { mode: 'login' | 'signup' }) {
  const isSignup = mode === 'signup';
  const navigate = useNavigate();
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const recoveryTrigger = useRef<HTMLButtonElement>(null);

  if (busy) return <LoadingScreen />;
  if (session) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const normalizedEmail = email.trim();
    const validation: typeof errors = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      validation.email = 'Please enter a valid email address.';
    }
    if (!password) validation.password = 'Please enter your password.';
    else if (isSignup && password.length < 8) validation.password = 'Please add a password with at least 8 characters.';
    setErrors(validation);
    setError('');
    if (Object.keys(validation).length) return;

    setBusy(true);
    try {
      const { data } = await api.post<{ token: string }>(`/api/users/${mode}`, {
        email: normalizedEmail,
        password,
      });
      if (typeof data.token !== 'string') throw new Error('Missing token');
      signIn(data.token);
      navigate('/dashboard', { replace: true });
    } catch (failure) {
      setError(errorMessage(failure, isSignup
        ? 'We couldn’t create your account. Check your details and try again.'
        : 'We couldn’t log you in. Please try again.'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <Link to="/" className="brand auth-brand" aria-label="Spoonful home"><BrandLogo /></Link>
      <section className={`auth-panel auth-panel-${mode}`} aria-labelledby="auth-heading">
        <h1 id="auth-heading">{isSignup ? 'Create an Account' : 'Welcome Back!'}</h1>
        {!isSignup && <p className="intro">Log in to your account to continue</p>}
        <form onSubmit={handleSubmit} noValidate aria-busy={busy}>
          <div className="field">
            <label htmlFor="email">{isSignup ? 'Username' : 'Email'}</label>
            <input
              id="email" name="email" type="email" autoComplete="username"
              placeholder={isSignup ? 'Enter your email address' : 'Email'}
              value={email} onChange={(event) => setEmail(event.target.value)}
              disabled={busy} required aria-invalid={Boolean(errors.email)}
              aria-describedby={errors.email ? 'email-error' : isSignup ? 'email-hint' : undefined}
            />
            {errors.email ? <p className="field-error" id="email-error">{errors.email}</p>
              : isSignup && <p className="sr-only" id="email-hint">Use your email address as your username.</p>}
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password" name="password" type="password"
              autoComplete={isSignup ? 'new-password' : 'current-password'}
              placeholder="Enter a password" value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={busy} required aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && <p className="field-error" id="password-error">{errors.password}</p>}
            {!isSignup && <button type="button" className="forgot-password-link" ref={recoveryTrigger}
              disabled={busy} aria-haspopup="dialog" onClick={() => setShowRecovery(true)}>Forgot Password?</button>}
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="button-stack form-actions">
            <button className="button button-primary" type="submit" disabled={busy}>
              {busy ? (isSignup ? 'Creating Account…' : 'Logging In…') : (isSignup ? 'Create Account' : 'Login')}
            </button>
            {isSignup ? <Link className="button button-secondary" to="/login">Cancel</Link>
              : <Link className="button button-secondary" to="/signup">Create an Account</Link>}
            {!isSignup && <Link className="text-link" to="/recipes">Explore Recipes without Logging In</Link>}
          </div>
          <p className="sr-only" role="status">{busy ? 'Please wait.' : ''}</p>
        </form>
      </section>
      {showRecovery && <PasswordRecoveryDialog onClose={() => setShowRecovery(false)} returnFocus={recoveryTrigger.current} />}
    </main>
  );
}
