import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { recipeError } from './errors';
import type { Recipe } from './types';
export function useRecipe(id: string | undefined) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError(''); setRecipe(null);
    void api.get<Recipe>(`/api/recipes/${encodeURIComponent(id || '')}`, { signal: controller.signal }).then(({ data }) => {
      if (!data || typeof data._id !== 'string') throw new Error('Unexpected recipe response');
      if (!controller.signal.aborted) setRecipe(data);
    }).catch((cause) => { if (!controller.signal.aborted) setError(recipeError(cause, 'We couldn’t load this recipe. Please try again.')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id, attempt]);
  return { recipe, loading, error, retry: () => setAttempt((value) => value + 1) };
}
