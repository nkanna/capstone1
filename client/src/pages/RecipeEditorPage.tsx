import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Header } from '../components/Header';
import { RecipeForm } from '../components/RecipeForm';
import { api } from '../lib/api';
import { useRecipe } from '../recipes/useRecipe';
import type { RecipeInput } from '../recipes/types';
export function CreateRecipePage() {
  const navigate = useNavigate();
  async function save(input: RecipeInput) { await api.post('/api/recipes', input); navigate('/dashboard', { replace: true, state: { notice: 'Recipe created successfully.' } }); }
  return <><Header /><main className="page-container recipe-editor"><Link className="back-link" to="/dashboard">← Your Recipes</Link><h1>Create a Recipe</h1><RecipeForm onSave={save} /></main></>;
}
export function EditRecipePage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { recipe, loading, error, retry } = useRecipe(id);
  const navigate = useNavigate();
  async function save(input: RecipeInput) { await api.put(`/api/recipes/${id}`, input); navigate('/dashboard', { replace: true, state: { notice: 'Recipe updated successfully.' } }); }
  return <><Header /><main className="page-container recipe-editor"><Link className="back-link" to="/dashboard">← Your Recipes</Link><h1>Edit Recipe</h1>
    {loading && <p role="status">Loading recipe…</p>}
    {error && <div className="error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}>Try Again</button></div>}
    {!loading && !error && recipe && (String(recipe.ownerId) === session?.user.id ? <RecipeForm key={recipe._id} initial={recipe} onSave={save} /> : <p className="form-error" role="alert">Only the creator can edit this recipe.</p>)}
  </main></>;
}
