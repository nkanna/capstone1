import { useState } from 'react';
import { Link } from 'react-router';
import { safeImageUrl } from '../recipes/types';
import type { Recipe } from '../recipes/types';
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
      {recipe.description && <p className="recipe-description">{recipe.description}</p>}
      <Link className="button button-secondary card-view" to={`/recipes/${recipe._id}`}>View Recipe</Link>
      {onDelete && <div className="card-actions"><Link className="button button-secondary" to={`/recipes/${recipe._id}/edit`}>Edit</Link><button className="button button-danger" onClick={() => onDelete(recipe)}>Delete</button></div>}
    </div>
  </article>;
}
