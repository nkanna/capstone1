import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { api } from '../lib/api';
import { exampleRecipe, logIn } from '../test/recipeFixtures';
import { CreateRecipePage, EditRecipePage } from './RecipeEditorPage';
function Destination() { const location = useLocation(); return <h1>{location.state?.notice}</h1>; }
function editor(mode: 'new' | 'edit') {
  logIn();
  render(<MemoryRouter initialEntries={[mode === 'new' ? '/recipes/new' : `/recipes/${exampleRecipe._id}/edit`]}><AuthProvider><Routes>
    <Route path="/recipes/new" element={<CreateRecipePage />} /><Route path="/recipes/:id/edit" element={<EditRecipePage />} />
    <Route path="/dashboard" element={<Destination />} />
  </Routes></AuthProvider></MemoryRouter>);
}
it('creates a recipe through axios and navigates with success feedback', async () => {
  const post = vi.spyOn(api, 'post').mockResolvedValue({ data: exampleRecipe });
  editor('new');
  await userEvent.type(screen.getByLabelText('Recipe Title'), 'Chickpea Stew');
  await userEvent.type(screen.getByLabelText('Image URL'), 'https://example.com/stew.jpg');
  await userEvent.type(screen.getByLabelText('Ingredient 1'), 'Chickpeas');
  await userEvent.type(screen.getByLabelText('Quantity 1'), '1 cup');
  await userEvent.type(screen.getByLabelText('Step 1'), 'Simmer until tender.');
  await userEvent.click(screen.getByRole('button', { name: 'Create Recipe' }));
  expect(await screen.findByRole('heading', { name: 'Recipe created successfully.' })).toBeInTheDocument();
  expect(post).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({ title: 'Chickpea Stew', instructions: [{ step: 1, description: 'Simmer until tender.' }] }));
});
it('fetches and prefills an owned recipe, then puts changed values to its endpoint', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: exampleRecipe });
  const put = vi.spyOn(api, 'put').mockResolvedValue({ data: exampleRecipe });
  editor('edit');
  expect(await screen.findByLabelText('Recipe Title')).toHaveValue('Chickpea Stew');
  await userEvent.clear(screen.getByLabelText('Recipe Title'));
  await userEvent.type(screen.getByLabelText('Recipe Title'), 'Spinach Stew');
  await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('heading', { name: 'Recipe updated successfully.' })).toBeInTheDocument();
  expect(put).toHaveBeenCalledWith(`/api/recipes/${exampleRecipe._id}`, expect.objectContaining({ title: 'Spinach Stew' }));
});
it('does not expose the edit form for another creator’s recipe', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { ...exampleRecipe, ownerId: 'other-cook' } });
  const put = vi.spyOn(api, 'put');
  editor('edit');
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the creator');
  expect(screen.queryByLabelText('Recipe Title')).not.toBeInTheDocument();
  expect(put).not.toHaveBeenCalled();
});
