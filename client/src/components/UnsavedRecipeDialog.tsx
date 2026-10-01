import { useEffect, useRef } from 'react';

export function UnsavedRecipeDialog({ onSave, onDiscard, onCancel }: {
  onSave: () => void; onDiscard: () => void; onCancel: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="unsaved-title" aria-describedby="unsaved-description"
    onCancel={(event) => { event.preventDefault(); onCancel(); }}>
    <h2 id="unsaved-title">You have unsaved changes.</h2>
    <p id="unsaved-description">Do you want to save your recipe before leaving?</p>
    <div className="button-stack">
      <button className="button button-primary" type="button" onClick={onSave}>Save Changes</button>
      <button className="button button-secondary" type="button" onClick={onDiscard}>Continue without Saving</button>
      <button className="text-button" type="button" onClick={onCancel} autoFocus>Cancel</button>
    </div>
  </dialog>;
}
