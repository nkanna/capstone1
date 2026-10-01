import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Header } from '../components/Header';
import { RecipeCard } from '../components/RecipeCard';
import { DeleteRecipeDialog } from '../components/DeleteRecipeDialog';
import { useRecipes } from '../recipes/useRecipes';
import type { Recipe } from '../recipes/types';
export function DashboardPage() {
  const { session } = useAuth();
  const { recipes, loading, error, retry, remove } = useRecipes();
  const location = useLocation();
  const [notice, setNotice] = useState<string>(typeof location.state?.notice === 'string' ? location.state.notice : '');
  const [pending, setPending] = useState<Recipe | null>(null);
  const own = recipes.filter((recipe) => String(recipe.ownerId) === session?.user.id);
  return <><Header /><main className="dashboard-page page-container">
    <p className="intro">Welcome back! Manage your recipes or add a new one.</p><h1>Your Recipes</h1>
    {notice && <p className="success-message" role="status">{notice}</p>}
    <Link className="button button-primary dashboard-create" to="/recipes/new">Add Recipe</Link>
    {loading && <p role="status">Loading your recipes…</p>}
    {error && <div className="error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}>Try Again</button></div>}
    {!loading && !error && (own.length ? <div className="recipe-grid dashboard-grid">{own.map((recipe) => <RecipeCard recipe={recipe} onDelete={setPending} key={recipe._id} />)}</div>
      : <p className="empty-message">You haven’t added any recipes yet. Add your first recipe to get started.</p>)}
  </main>{pending && <DeleteRecipeDialog recipe={pending} onCancel={() => setPending(null)} onDeleted={(id, alreadyRemoved) => {
    remove(id); setPending(null); setNotice(alreadyRemoved ? 'This recipe was already removed.' : 'Recipe deleted successfully.');
  }} />}</>;
}
