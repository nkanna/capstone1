import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import { Header } from '../components/Header';
import { RecipeForm } from '../components/RecipeForm';
import { useAuth } from '../auth/useAuth';
import { useAi } from '../ai/useAi';
import { aiErrorMessage } from '../ai/stream';
import { api } from '../lib/api';
import type { RecipeInput } from '../recipes/types';
const diets = ['No preference', 'Vegetarian', 'Vegan', 'Gluten-free'];
export function RecipeGeneratorPage() {
  const { session } = useAuth();
  const { draft, setDraft } = useAi();
  const [ingredients, setIngredients] = useState('');
  const [diet, setDiet] = useState('No preference');
  const [minutes, setMinutes] = useState(30);
  const [servings, setServings] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  const navigate = useNavigate();
  useEffect(() => () => { request.current?.abort(); }, []);
  async function generate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (request.current) return;
    if (!ingredients.trim()) { setError('Please add the ingredients you have.'); return; }
    const work = new AbortController(); request.current = work;
    setBusy(true); setError('');
    try {
      const { data } = await api.post<{ recipe: RecipeInput }>('/api/ai/recipe', { ingredients: ingredients.trim(), diet, minutes, servings }, { signal: work.signal, timeout: 120000 });
      if (!data.recipe || !Array.isArray(data.recipe.ingredients) || !Array.isArray(data.recipe.instructions)) throw new Error('The recipe could not be read. Please generate another recipe.');
      if (!work.signal.aborted) setDraft(data.recipe);
    } catch (cause) { if (!work.signal.aborted) { const message = await aiErrorMessage(cause); if (!work.signal.aborted) setError(message); } }
    finally { if (request.current === work) { request.current = null; if (!work.signal.aborted) setBusy(false); } }
  }
  function cancel() { request.current?.abort(); request.current = null; setBusy(false); }
  async function save(input: RecipeInput) {
    await api.post('/api/recipes', input);
    setDraft(null);
    navigate('/dashboard', { state: { notice: 'Generated recipe saved successfully.' } });
  }
  return <><Header /><main className="page-container recipe-editor">
    <h1>Recipe Generator</h1><p className="intro">Turn ingredients you have into a recipe that fits your preferences.</p>
    <form onSubmit={(event) => void generate(event)} noValidate>
      <fieldset className="form-fields" disabled={busy}>
        <div className="field"><label htmlFor="available-ingredients">Ingredients you have</label><textarea id="available-ingredients" rows={3} maxLength={2000} value={ingredients} onChange={(event) => setIngredients(event.target.value)} placeholder="e.g. chickpeas, spinach, tomatoes" required /></div>
        <div className="field"><label htmlFor="diet">Dietary preference</label><select id="diet" value={diet} onChange={(event) => setDiet(event.target.value)}>{diets.map((value) => <option key={value}>{value}</option>)}</select></div>
        <div className="generator-options"><div className="field"><label htmlFor="minutes">Cooking time</label><select id="minutes" value={minutes} onChange={(event) => setMinutes(Number(event.target.value))}>{[15,30,45,60,90].map((value) => <option value={value} key={value}>{value} minutes</option>)}</select></div>
          <div className="field"><label htmlFor="servings">Servings</label><select id="servings" value={servings} onChange={(event) => setServings(Number(event.target.value))}>{[1,2,3,4,5,6,7,8].map((value) => <option value={value} key={value}>{value}</option>)}</select></div></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="button button-primary generator-submit" type="submit">{busy ? 'Creating recipe…' : 'Generate Recipe'}</button>
      </fieldset>
      {busy && <><p className="ai-notice" role="status">Creating your recipe…</p><button className="text-button" type="button" onClick={cancel}>Cancel Generation</button></>}
    </form>
    {draft && <section className="generated-recipe" aria-labelledby="generated-title"><h2 id="generated-title">Your Generated Recipe</h2>
      {session ? <><p className="intro">Review and edit the recipe, then add an image URL before saving.</p>
        <RecipeForm key={JSON.stringify(draft)} initial={draft} onSave={save} submitLabel="Save Recipe" /></>
        : <><h3>{draft.title}</h3><p>{draft.description}</p><div className="tags">{draft.tags.map((tag, index) => <span className="tag" key={index}>{tag}</span>)}</div>
          <h3>Ingredients</h3><ul>{draft.ingredients.map((item, index) => <li key={index}>{item.quantity} {item.name}</li>)}</ul>
          <h3>Instructions</h3><ol>{draft.instructions.map((item, index) => <li key={index}>{item.description}</li>)}</ol>
          <p className="intro">Sign in, then return to Recipe Generator to edit and save this draft.</p><Link className="button button-secondary" to="/login">Login to Save</Link></>}
    </section>}
  </main></>;
}
