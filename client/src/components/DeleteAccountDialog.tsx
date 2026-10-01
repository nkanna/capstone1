import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { api } from '../lib/api';
import { accountError } from '../auth/account';

export function DeleteAccountDialog({ onCancel, onDeleted, returnFocus }: {
  onCancel: () => void; onDeleted: () => void; returnFocus: HTMLButtonElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const id = useId();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => { element?.close(); returnFocus?.focus(); };
  }, [returnFocus]);
  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    if (!password) { setError('Enter your current password to delete your account.'); return; }
    setBusy(true); setError('');
    try { await api.delete('/api/account', { data: { currentPassword: password } }); onDeleted(); }
    catch (cause) { setError(accountError(cause)); setBusy(false); }
  }
  return <dialog ref={dialog} className="confirm-dialog delete-account-dialog"
    aria-labelledby={`${id}-title`} aria-describedby={`${id}-description`}
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id={`${id}-title`}>Delete account?</h2>
    <p id={`${id}-description`}>Do you want to delete your account and all your recipes? This action cannot be undone.</p>
    <form onSubmit={(event) => void confirm(event)} noValidate aria-busy={busy}>
      <div className="field"><label htmlFor={`${id}-password`}>Current password</label>
        <input id={`${id}-password`} type="password" autoComplete="current-password" value={password}
          onChange={(event) => setPassword(event.target.value)} disabled={busy} required
          aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} /></div>
      {error && <p id={`${id}-error`} className="form-error" role="alert">{error}</p>}
      <div className="dialog-actions">
        <button type="submit" className="button button-primary" disabled={busy}>{busy ? 'Deleting…' : 'Yes, Delete Account'}</button>
        <button type="button" className="button button-secondary" onClick={onCancel} disabled={busy} autoFocus>Nevermind</button>
      </div>
    </form>
  </dialog>;
}
