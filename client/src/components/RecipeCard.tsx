import { useState } from 'react';
import { Link } from 'react-router';
import { safeImageUrl } from '../recipes/types';
import type { Recipe } from '../recipes/types';
import { RecipeActionIcon } from './RecipeActionIcon';
export function RecipeCard({ recipe, onDelete }: { recipe: Recipe; onDelete?: (recipe: Recipe) => void }) {
  const [failed, setFailed] = useState(false);
  const image = safeImageUrl(recipe.image);
  return <article className="recipe-card">
    <Link to={`/recipes/${recipe._id}`} aria-label={`View ${recipe.title}`} className="recipe-photo-link">
      {image && !failed ? <img src={image} alt={recipe.title} loading="lazy" className="recipe-image" onError={() => setFailed(true)} /> : <div className="recipe-image image-placeholder">Recipe photo unavailable</div>}
    </Link>
    <div className="recipe-card-body">
      <h2><Link to={`/recipes/${recipe._id}`}>{recipe.title}</Link></h2>
      {recipe.createdAt && !Number.isNaN(Date.parse(recipe.createdAt)) && <p className="recipe-date">Created on {new Date(recipe.createdAt).toLocaleDateString()}</p>}
      <div className="tags">{(recipe.tags || []).map((tag, index) => <span className="tag" key={`${tag}-${index}`}>{tag}</span>)}</div>
      {onDelete ? <div className="card-actions"><button className="recipe-icon-button" aria-label="Delete" title={`Delete ${recipe.title}`} onClick={() => onDelete(recipe)}><RecipeActionIcon kind="delete" /></button>
        <Link className="recipe-icon-button" aria-label="Edit" title={`Edit ${recipe.title}`} to={`/recipes/${recipe._id}/edit`}><RecipeActionIcon kind="edit" /></Link></div>
        : <Link className="card-view" to={`/recipes/${recipe._id}`}>View Recipe</Link>}
    </div>
  </article>;
}
