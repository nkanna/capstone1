import { startTransition, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import axios from 'axios';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { accountError } from '../auth/account';
import { api } from '../lib/api';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { DeleteAccountDialog } from '../components/DeleteAccountDialog';
import './profile.css';

export function ProfilePage() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [account, setAccount] = useState<{ _id: string; email: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const work = new AbortController();
    setLoading(true); setError('');
    void api.get('/api/account', { signal: work.signal }).then(({ data }) => {
      if (typeof data?.email !== 'string') throw new Error('Invalid account response');
      if (!work.signal.aborted) setAccount(data);
    }).catch((cause: unknown) => {
      if (work.signal.aborted) return;
      if (axios.isAxiosError(cause) && cause.response?.status === 401) {
        signOut(); navigate('/login', { replace: true });
      } else setError(accountError(cause));
    }).finally(() => { if (!work.signal.aborted) setLoading(false); });
    return () => work.abort();
  }, [attempt, signOut, navigate]);
  if (loading) return <LoadingScreen />;
  return <><Header /><main className="page-container profile-page">
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/dashboard">Home</Link><span aria-hidden="true">&gt;</span><span>Your Profile</span></nav>
    <h1>Your Profile</h1>
    {error && <div className="error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={() => setAttempt(value => value + 1)}>Try Again</button></div>}
    {!error && account && <ProfileForm email={account.email} />}
  </main></>;
}

function ProfileForm({ email: initialEmail }: { email: string }) {
  const { signIn, signOut } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(initialEmail);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);
  const deleteTrigger = useRef<HTMLButtonElement>(null);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Please enter a valid email address.'); return; }
    if (!currentPassword) { setError('Enter your current password to save changes.'); return; }
    if (newPassword && (newPassword.length < 8 || new TextEncoder().encode(newPassword).length > 72)) {
      setError('Use a new password with at least 8 characters and no more than 72 bytes.'); return;
    }
    setBusy(true);
    try {
      const { data } = await api.put<{ token: string }>('/api/account', { email: email.trim(), currentPassword, ...(newPassword ? { newPassword } : {}) });
      signIn(data.token);
      navigate('/dashboard', { replace: true, state: { notice: 'Your profile info was successfully updated.' } });
    } catch (cause) { setError(accountError(cause)); setBusy(false); }
  }
  return <>
    <form onSubmit={(event) => void save(event)} noValidate aria-busy={busy}>
      <fieldset className="form-fields" disabled={busy}>
        <div className="field"><label htmlFor="profile-email">Username</label>
          <input id="profile-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
        <div className="field"><label htmlFor="profile-password">Password</label>
          <input id="profile-password" type="password" autoComplete="current-password" placeholder="Enter your current password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required aria-describedby="profile-password-hint" />
          <p id="profile-password-hint" className="field-hint">Enter your current password to save changes.</p></div>
        <details className="profile-password-change"><summary>Change password</summary>
          <div className="field"><label htmlFor="profile-new-password">New password</label>
            <input id="profile-new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} />
            <p className="field-hint">Leave blank to keep your current password.</p></div>
        </details>
        {error && <p className="form-error" role="alert">{error}</p>}
        <div className="button-stack form-actions">
          <button type="submit" className="button button-primary">{busy ? 'Saving…' : 'Save Changes'}</button>
          <button type="button" className="button button-secondary" onClick={() => {
            startTransition(() => { signOut(); navigate('/'); });
          }}>Log Out</button>
          <button type="button" className="text-button profile-delete" ref={deleteTrigger} aria-haspopup="dialog" onClick={() => setDeleting(true)}>Delete Account</button>
        </div>
      </fieldset>
    </form>
    {deleting && <DeleteAccountDialog returnFocus={deleteTrigger.current} onCancel={() => setDeleting(false)} onDeleted={() => {
      // BrowserRouter transitions navigation. Keep the session update in the
      // same transition so the protected route cannot redirect to Login first.
      startTransition(() => {
        signOut(); navigate('/', { replace: true, state: { notice: 'Your account and recipes were deleted.' } });
      });
    }} />}
  </>;
}
