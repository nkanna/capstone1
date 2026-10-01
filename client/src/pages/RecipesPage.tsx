import { useState } from 'react';
import { Header } from '../components/Header';
import { RecipeCard } from '../components/RecipeCard';
import { useRecipes } from '../recipes/useRecipes';
export function RecipesPage() {
  const { recipes, loading, error, retry } = useRecipes();
  const [search, setSearch] = useState('');
  const query = search.trim().toLocaleLowerCase();
  const filtered = recipes.filter((recipe) => [recipe.title, ...(recipe.tags || []), ...(recipe.ingredients || []).map((ingredient) => ingredient.name)]
    .some((value) => value?.toLocaleLowerCase().includes(query)));
  return <><Header /><main className="page-container recipes-page">
    <h1>Recipe List</h1>
    <div className="field search-field"><label className="sr-only" htmlFor="recipe-search">Search recipes</label><input id="recipe-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recipes" /></div>
    {loading && <p role="status">Loading recipes…</p>}
    {error && <div className="error-panel" role="alert"><p>{error}</p><button className="button button-secondary" onClick={retry}>Try Again</button></div>}
    {!loading && !error && (filtered.length ? <div className="recipe-grid">{filtered.map((recipe) => <RecipeCard recipe={recipe} key={recipe._id} />)}</div>
      : <p className="empty-message" role="status">{query ? 'We couldn’t find any recipes.' : 'No recipes have been shared yet.'}</p>)}
  </main></>;
}
