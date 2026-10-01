import axios from 'axios';
export function recipeError(error: unknown, fallback: string): string {
  if (!axios.isAxiosError(error)) return fallback;
  if (!error.response) return 'We couldn’t connect. Please try again.';
  if (error.response.status === 401) return 'Your session has expired. Please log out and log in again.';
  if (error.response.status === 403) return 'Only the creator can change this recipe.';
  if (error.response.status === 404) return 'This recipe is no longer available.';
  if (error.response.status === 400) return 'Please check your recipe fields and try again.';
  return fallback;
}
