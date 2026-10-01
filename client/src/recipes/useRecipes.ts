import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import type { Recipe } from './types';
export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    void api.get<Recipe[]>('/api/recipes', { signal: controller.signal }).then(({ data }) => {
      if (!Array.isArray(data)) throw new Error('Unexpected recipe response');
      if (!controller.signal.aborted) setRecipes(data);
    }).catch(() => { if (!controller.signal.aborted) setError('We couldn’t load the recipes. Please try again.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);
  return { recipes, loading, error, retry: () => setAttempt((value) => value + 1),
    remove: (id: string) => setRecipes((items) => items.filter((recipe) => recipe._id !== id)) };
}
