import { SESSION_KEY } from '../auth/session';
import type { Recipe } from '../recipes/types';
export const exampleRecipe: Recipe = {
  _id: '507f1f77bcf86cd799439011', ownerId: 'cook-1', title: 'Chickpea Stew', description: 'A warm supper.',
  image: 'https://example.com/stew.jpg', ingredients: [{ name: 'Chickpeas', quantity: '1 cup' }],
  instructions: [{ step: 1, description: 'Simmer until tender.' }], tags: ['vegan'],
};
export function logIn(id = 'cook-1') {
  const payload = btoa(JSON.stringify({ user: { _id: id, email: 'cook@example.com' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
  sessionStorage.setItem(SESSION_KEY, `header.${payload}.signature`);
}
