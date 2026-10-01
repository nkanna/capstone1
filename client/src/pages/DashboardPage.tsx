import { useState } from 'react';
import { Link, useLocation } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
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
  if (loading) return <LoadingScreen />;
  return <><Header /><main className="dashboard-page page-container">
    {notice && <p className="success-message" role="status">{notice}</p>}
    <p className="intro">Welcome back! Manage your recipes or add a new one.</p><h1>Your Recipes</h1>
    {error && <div className="error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}>Try Again</button></div>}
    {!loading && !error && (own.length ? <div className="recipe-grid dashboard-grid" role="region" aria-label="Your recipe cards" tabIndex={0}>{own.map((recipe) => <RecipeCard recipe={recipe} onDelete={setPending} key={recipe._id} />)}</div>
      : <p className="empty-message">Your recipes will show up here.</p>)}
    <div className="button-stack dashboard-actions"><Link className="button button-primary dashboard-create" to="/recipes/new">Create Recipe</Link>
      <Link className="button button-secondary dashboard-browse" to="/recipes">Browse Recipes</Link></div>
  </main>{pending && <DeleteRecipeDialog recipe={pending} onCancel={() => setPending(null)} onDeleted={(id, alreadyRemoved) => {
    remove(id); setPending(null); setNotice(alreadyRemoved ? 'This recipe was already removed.' : 'Recipe deleted successfully.');
  }} />}</>;
}
