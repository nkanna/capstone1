import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { expect, it, vi } from 'vitest';
import { RecipeForm } from './RecipeForm';
import { exampleRecipe } from '../test/recipeFixtures';
it('rejects required fields and unsafe image URLs before calling save', async () => {
  const save = vi.fn();
  render(<MemoryRouter><RecipeForm onSave={save} /></MemoryRouter>);
  await userEvent.type(screen.getByLabelText('Image URL'), 'javascript:alert(1)');
  await userEvent.click(screen.getByRole('button', { name: 'Create Recipe' }));
  expect(screen.getByRole('alert')).toHaveTextContent('highlighted fields');
  expect(screen.getByText('Please add a recipe title.')).toBeInTheDocument();
  expect(screen.getByText('Please add a valid http or https image URL.')).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it('prefills edit fields, adds/removes rows, and saves sequential steps without document IDs', async () => {
  const save = vi.fn().mockResolvedValue(undefined);
  render(<MemoryRouter><RecipeForm initial={exampleRecipe} onSave={save} /></MemoryRouter>);
  expect(screen.getByLabelText('Recipe Title')).toHaveValue('Chickpea Stew');
  expect(screen.getByLabelText('Ingredient 1')).toHaveValue('Chickpeas');
  await userEvent.click(screen.getByRole('button', { name: 'Add Ingredient' }));
  await userEvent.type(screen.getByLabelText('Ingredient 2'), 'Spinach');
  await userEvent.type(screen.getByLabelText('Quantity 2'), '2 cups');
  await userEvent.click(screen.getByRole('button', { name: 'Remove ingredient 1' }));
  await userEvent.click(screen.getByRole('button', { name: 'Add Step' }));
  await userEvent.type(screen.getByLabelText('Step 2'), 'Serve warm.');
  await userEvent.click(screen.getByRole('button', { name: 'Remove step 1' }));
  await userEvent.clear(screen.getByLabelText('Tags (optional)'));
  await userEvent.type(screen.getByLabelText('Tags (optional)'), 'vegan, easy, vegan');
  await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(save).toHaveBeenCalledWith({ title: 'Chickpea Stew', description: 'A warm supper.', image: 'https://example.com/stew.jpg',
    ingredients: [{ name: 'Spinach', quantity: '2 cups' }], instructions: [{ step: 1, description: 'Serve warm.' }], tags: ['vegan', 'easy'] });
});
it('keeps the draft and enables retry after a permission error', async () => {
  const save = vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 403 } });
  render(<MemoryRouter><RecipeForm initial={exampleRecipe} onSave={save} /></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the creator');
  expect(screen.getByLabelText('Recipe Title')).toHaveValue('Chickpea Stew');
  expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
});
