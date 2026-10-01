import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { api } from '../lib/api';
import { exampleRecipe } from '../test/recipeFixtures';
import { RecipeDetailPage } from './RecipeDetailPage';
function detail() { render(<MemoryRouter initialEntries={[`/recipes/${exampleRecipe._id}`]}><AuthProvider><Routes><Route path="/recipes/:id" element={<RecipeDetailPage />} /></Routes></AuthProvider></MemoryRouter>); }
it('lets a guest read the full recipe through its own public route', async () => {
  const get = vi.spyOn(api, 'get').mockResolvedValue({ data: exampleRecipe });
  detail();
  expect(await screen.findByRole('heading', { name: 'Chickpea Stew' })).toBeInTheDocument();
  expect(screen.getByText('1 cup Chickpeas')).toBeInTheDocument();
  expect(screen.getByText('Simmer until tender.')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Edit Recipe' })).not.toBeInTheDocument();
  expect(get).toHaveBeenCalledWith(`/api/recipes/${exampleRecipe._id}`, expect.objectContaining({ signal: expect.any(AbortSignal) }));
});
it('shows a useful missing-recipe message for a 404', async () => {
  vi.spyOn(api, 'get').mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  detail();
  expect(await screen.findByRole('alert')).toHaveTextContent('This recipe is no longer available.');
});
