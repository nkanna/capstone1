import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useAuth } from '../auth/useAuth';
import { Header } from '../components/Header';
import { DeleteRecipeDialog } from '../components/DeleteRecipeDialog';
import { safeImageUrl } from '../recipes/types';
import { useRecipe } from '../recipes/useRecipe';
export function RecipeDetailPage() {
  const { id } = useParams();
  const { session } = useAuth();
  const { recipe, loading, error, retry } = useRecipe(id);
  const [pending, setPending] = useState(false);
  const [failedImage, setFailedImage] = useState('');
  const navigate = useNavigate();
  const image = safeImageUrl(recipe?.image);
  const own = recipe && String(recipe.ownerId) === session?.user.id;
  return <><Header /><main className="page-container recipe-detail-page">
    <Link className="back-link" to="/recipes">← Recipe List</Link>
    {loading && <p role="status">Loading recipe…</p>}
    {error && <div className="error-panel" role="alert"><h1>Recipe unavailable</h1><p>{error}</p><button className="button button-secondary" onClick={retry}>Try Again</button></div>}
    {!loading && !error && recipe && <article>
      <h1>{recipe.title}</h1>
      {image && failedImage !== image ? <img src={image} alt={recipe.title} className="detail-image" onError={() => setFailedImage(image)} /> : <div className="detail-image image-placeholder">Recipe photo unavailable</div>}
      {recipe.description && <p className="detail-description">{recipe.description}</p>}
      <div className="tags">{(recipe.tags || []).map((tag, index) => <span className="tag" key={`${tag}-${index}`}>{tag}</span>)}</div>
      <section className="detail-section"><h2>Ingredients</h2><ul>{(recipe.ingredients || []).map((item, index) => <li key={index}>{item.quantity} {item.name}</li>)}</ul></section>
      <section className="detail-section"><h2>Instructions</h2><ol>{[...(recipe.instructions || [])].sort((a, b) => a.step - b.step).map((item, index) => <li key={index}>{item.description}</li>)}</ol></section>
      {own && <div className="detail-actions"><Link className="button button-secondary" to={`/recipes/${recipe._id}/edit`}>Edit Recipe</Link><button className="button button-danger" onClick={() => setPending(true)}>Delete</button></div>}
    </article>}
  </main>{pending && recipe && <DeleteRecipeDialog recipe={recipe} onCancel={() => setPending(false)} onDeleted={(_, alreadyRemoved) => navigate('/dashboard', { replace: true, state: { notice: alreadyRemoved ? 'This recipe was already removed.' : 'Recipe deleted successfully.' } })} />}</>;
}
