import { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router';

export function PasswordRecoveryDialog({ onClose, returnFocus }: {
  onClose: () => void;
  returnFocus: HTMLButtonElement | null;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
      returnFocus?.focus();
    };
  }, [returnFocus]);

  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby={titleId} aria-describedby={descriptionId}
    onCancel={(event) => { event.preventDefault(); onClose(); }}>
    <h2 id={titleId}>Password recovery</h2>
    <p id={descriptionId}>Password recovery is currently unavailable. Creating a new account will not give you access to your existing recipes.</p>
    <div className="button-stack">
      <button type="button" className="button button-primary" onClick={onClose} autoFocus>Back to Login</button>
      <Link className="button button-secondary" to="/signup" onClick={onClose}>Create an Account</Link>
    </div>
  </dialog>;
}
