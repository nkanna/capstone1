import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router';
import { recipeError } from '../recipes/errors';
import { safeImageUrl } from '../recipes/types';
import type { Recipe, RecipeInput } from '../recipes/types';
type IngredientRow = { key: string; name: string; quantity: string };
type StepRow = { key: string; description: string };
const blankIngredient = (): IngredientRow => ({ key: crypto.randomUUID(), name: '', quantity: '' });
const blankStep = (): StepRow => ({ key: crypto.randomUUID(), description: '' });
export function RecipeForm({ initial, onSave, submitLabel }: { initial?: Recipe | RecipeInput; onSave: (input: RecipeInput) => Promise<void>; submitLabel?: string }) {
  const [title, setTitle] = useState(initial?.title || '');
  const [description, setDescription] = useState(initial?.description || '');
  const [image, setImage] = useState(initial?.image || '');
  const [tags, setTags] = useState((initial?.tags || []).join(', '));
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() => initial?.ingredients?.length
    ? initial.ingredients.map((item) => ({ ...item, key: crypto.randomUUID() })) : [blankIngredient()]);
  const [steps, setSteps] = useState<StepRow[]>(() => initial?.instructions?.length
    ? [...initial.instructions].sort((a, b) => a.step - b.step).map((item) => ({ key: crypto.randomUUID(), description: item.description })) : [blankStep()]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function fieldError(key: string) { return errors[key] ? <p className="field-error" id={`${key}-error`}>{errors[key]}</p> : null; }
  function accessibility(key: string) { return { 'aria-invalid': Boolean(errors[key]), 'aria-describedby': errors[key] ? `${key}-error` : undefined }; }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = 'Please add a recipe title.';
    if (!safeImageUrl(image.trim())) next.image = 'Please add a valid http or https image URL.';
    ingredients.forEach((item) => {
      if (!item.name.trim()) next[`name-${item.key}`] = 'Please add an ingredient name.';
      if (!item.quantity.trim()) next[`quantity-${item.key}`] = 'Please add a quantity.';
    });
    steps.forEach((item) => { if (!item.description.trim()) next[`step-${item.key}`] = 'Please describe this step.'; });
    setErrors(next); setError('');
    if (Object.keys(next).length) { setError('Please complete the highlighted fields.'); return; }
    setBusy(true);
    try {
      await onSave({ title: title.trim(), description: description.trim(), image: image.trim(),
        ingredients: ingredients.map((item) => ({ name: item.name.trim(), quantity: item.quantity.trim() })),
        instructions: steps.map((item, index) => ({ step: index + 1, description: item.description.trim() })),
        tags: [...new Set(tags.split(',').map((tag) => tag.trim()).filter(Boolean))] });
    } catch (cause) { setError(recipeError(cause, 'We couldn’t save your recipe. Please try again.')); setBusy(false); }
  }
  return <form onSubmit={(event) => void submit(event)} noValidate aria-busy={busy}>
    <p className="field-hint form-hint">Title, image URL, ingredients, and instructions are required.</p>
    {error && <p className="form-error" role="alert">{error}</p>}
    <fieldset className="form-fields" disabled={busy}>
      <div className="field"><label htmlFor="title">Recipe Title</label><input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Chickpea Stew" required {...accessibility('title')} />{fieldError('title')}</div>
      <div className="field"><label htmlFor="description">Description (optional)</label><textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} rows={3} placeholder="Describe your recipe" /></div>
      <div className="field"><label htmlFor="image">Image URL</label><input id="image" type="url" value={image} onChange={(event) => setImage(event.target.value)} placeholder="https://example.com/recipe.jpg" required {...accessibility('image')} />{fieldError('image')}<p className="field-hint">Use a direct link to an image.</p></div>
      <section className="form-section" aria-labelledby="ingredients-title"><h2 id="ingredients-title">Ingredients</h2>
        {ingredients.map((item, index) => <div className="ingredient-row" key={item.key}>
          <div className="field"><label htmlFor={`name-${item.key}`}>Ingredient {index + 1}</label><input id={`name-${item.key}`} value={item.name} onChange={(event) => setIngredients((rows) => rows.map((row) => row.key === item.key ? { ...row, name: event.target.value } : row))} placeholder="e.g. Chickpeas" required {...accessibility(`name-${item.key}`)} />{fieldError(`name-${item.key}`)}</div>
          <div className="field"><label htmlFor={`quantity-${item.key}`}>Quantity {index + 1}</label><input id={`quantity-${item.key}`} value={item.quantity} onChange={(event) => setIngredients((rows) => rows.map((row) => row.key === item.key ? { ...row, quantity: event.target.value } : row))} placeholder="e.g. 1 cup" required {...accessibility(`quantity-${item.key}`)} />{fieldError(`quantity-${item.key}`)}</div>
          <button className="text-button remove-row" type="button" disabled={ingredients.length === 1} aria-label={`Remove ingredient ${index + 1}`} onClick={() => setIngredients((rows) => rows.filter((row) => row.key !== item.key))}>Remove</button>
        </div>)}
        <button className="button button-secondary" type="button" onClick={() => setIngredients((rows) => [...rows, blankIngredient()])}>Add Ingredient</button>
      </section>
      <section className="form-section" aria-labelledby="instructions-title"><h2 id="instructions-title">Instructions</h2>
        {steps.map((item, index) => <div className="instruction-row" key={item.key}><div className="field">
          <label htmlFor={`step-${item.key}`}>Step {index + 1}</label><textarea id={`step-${item.key}`} rows={3} value={item.description} onChange={(event) => setSteps((rows) => rows.map((row) => row.key === item.key ? { ...row, description: event.target.value } : row))} placeholder="Describe this step" required {...accessibility(`step-${item.key}`)} />{fieldError(`step-${item.key}`)}</div>
          <button className="text-button" type="button" disabled={steps.length === 1} aria-label={`Remove step ${index + 1}`} onClick={() => setSteps((rows) => rows.filter((row) => row.key !== item.key))}>Remove Step</button>
        </div>)}
        <button className="button button-secondary" type="button" onClick={() => setSteps((rows) => [...rows, blankStep()])}>Add Step</button>
      </section>
      <div className="field"><label htmlFor="tags">Tags (optional)</label><input id="tags" value={tags} onChange={(event) => setTags(event.target.value)} placeholder="e.g. vegan, easy, gluten-free" aria-describedby="tags-hint" /><p id="tags-hint" className="field-hint">Separate tags with commas.</p></div>
      <div className="button-stack form-actions"><button className="button button-primary" type="submit">{busy ? 'Saving…' : submitLabel || (initial ? 'Save Changes' : 'Create Recipe')}</button>
        <Link className="button button-secondary" to="/dashboard" onClick={(event) => { if (busy) event.preventDefault(); }} aria-disabled={busy}>Cancel</Link></div>
    </fieldset>
  </form>;
}
