import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { api } from '../lib/api';
import { RecipesPage } from './RecipesPage';

function renderRecipes() {
  render(<MemoryRouter><AuthProvider><RecipesPage /></AuthProvider></MemoryRouter>);
}

it('lets guests fetch recipes and search by ingredient, tag, or title', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: [
    { _id: 'r1', title: 'Chickpea Stew', tags: ['Vegan'], ingredients: [{ name: 'Spinach', quantity: '1 cup' }], instructions: [] },
    { _id: 'r2', title: 'Tofu Stir Fry', tags: ['Quick'], ingredients: [{ name: 'Tofu' }], instructions: [] },
  ] });
  renderRecipes();
  await screen.findByRole('heading', { name: 'Chickpea Stew' });
  const search = screen.getByRole('searchbox');
  for (const term of ['spinach', 'vegan', 'chickpea']) {
    await userEvent.clear(search);
    await userEvent.type(search, term);
    expect(screen.getByRole('heading', { name: 'Chickpea Stew' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Tofu Stir Fry' })).not.toBeInTheDocument();
  }
  await userEvent.clear(search);
  await userEvent.type(search, 'cake');
  expect(screen.getByText('We couldn’t find any recipes.')).toBeInTheDocument();
});

it('offers a working retry after a recipe request fails', async () => {
  vi.spyOn(api, 'get').mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce({ data: [] });
  renderRecipes();
  expect(await screen.findByRole('alert')).toHaveTextContent('We couldn’t load the recipes.');
  await userEvent.click(screen.getByRole('button', { name: 'Try Again' }));
  expect(await screen.findByText('No recipes have been shared yet.')).toBeInTheDocument();
});
