import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { api } from '../lib/api';
import { recipeError } from '../recipes/errors';
import type { Recipe } from '../recipes/types';
export function DeleteRecipeDialog({ recipe, onCancel, onDeleted }: { recipe: Recipe; onCancel: () => void; onDeleted: (id: string, alreadyRemoved: boolean) => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  async function confirm() {
    setBusy(true); setError('');
    try { await api.delete(`/api/recipes/${recipe._id}`); onDeleted(recipe._id, false); }
    catch (cause) {
      if (axios.isAxiosError(cause) && cause.response?.status === 404) onDeleted(recipe._id, true);
      else { setError(recipeError(cause, 'We couldn’t delete this recipe. Please try again.')); setBusy(false); }
    }
  }
  return <dialog ref={dialog} className="confirm-dialog" aria-labelledby="delete-title" aria-describedby="delete-description"
    onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-title">Delete recipe?</h2><p id="delete-description">Do you want to delete this recipe? This action cannot be undone.<span className="sr-only"> Recipe: {recipe.title}.</span></p>
    {error && <p role="alert" className="form-error">{error}</p>}
    <div className="dialog-actions"><button className="button button-primary" disabled={busy} onClick={() => void confirm()}>{busy ? 'Deleting…' : 'Yes, Delete Recipe'}</button>
      <button className="button button-secondary" disabled={busy} onClick={onCancel} autoFocus>Nevermind</button></div>
  </dialog>;
}
