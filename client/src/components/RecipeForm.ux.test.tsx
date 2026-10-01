import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { RecipeForm } from './RecipeForm';
import { exampleRecipe } from '../test/recipeFixtures';

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
function editor(save = vi.fn().mockResolvedValue(undefined), existing = true) {
  render(<MemoryRouter initialEntries={['/editor']}><Routes>
    <Route path="/editor" element={<RecipeForm initial={existing ? exampleRecipe : undefined} onSave={save} />} />
    <Route path="/dashboard" element={<h1>Your Recipes</h1>} />
  </Routes></MemoryRouter>);
  return save;
}
async function changeAndCancel() {
  await userEvent.type(screen.getByLabelText('Recipe Title'), ' Updated');
  await userEvent.click(screen.getByRole('link', { name: 'Cancel' }));
  return screen.getByRole('dialog', { name: 'You have unsaved changes.' });
}

it('lets an unchanged recipe cancel directly without a confirmation or save', async () => {
  const save = editor();
  await userEvent.click(screen.getByRole('link', { name: 'Cancel' }));
  expect(screen.getByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it('keeps edited fields when cancelling the unsaved-changes dialog', async () => {
  const save = editor();
  const dialog = await changeAndCancel();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(screen.getByLabelText('Recipe Title')).toHaveValue('Chickpea Stew Updated');
  expect(save).not.toHaveBeenCalled();
});
it('discards edited fields only after choosing Continue without Saving', async () => {
  const save = editor();
  const dialog = await changeAndCancel();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Continue without Saving' }));
  expect(screen.getByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument();
  expect(save).not.toHaveBeenCalled();
});
it('saves the edited recipe through the normal form submission from the dialog', async () => {
  const save = editor();
  const dialog = await changeAndCancel();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
  expect(save).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ title: 'Chickpea Stew Updated' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
});
it('validates an incomplete draft instead of sending it when Save Changes is chosen', async () => {
  const save = editor(undefined, false);
  const dialog = await changeAndCancel();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('highlighted fields');
  expect(screen.getByLabelText('Recipe Title')).toHaveValue(' Updated');
  expect(save).not.toHaveBeenCalled();
});
it('keeps the draft and allows retry if saving from the dialog fails', async () => {
  const save = editor(vi.fn().mockRejectedValue({ isAxiosError: true, response: { status: 403 } }));
  const dialog = await changeAndCancel();
  await userEvent.click(within(dialog).getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the creator');
  expect(screen.getByLabelText('Recipe Title')).toHaveValue('Chickpea Stew Updated');
  expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
  expect(save).toHaveBeenCalledTimes(1);
});
it('warns on refresh only while values differ from the starting draft', async () => {
  editor();
  const unchanged = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(unchanged);
  expect(unchanged.defaultPrevented).toBe(false);
  await userEvent.type(screen.getByLabelText('Recipe Title'), ' Updated');
  const changed = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(changed);
  expect(changed.defaultPrevented).toBe(true);
  await userEvent.clear(screen.getByLabelText('Recipe Title'));
  await userEvent.type(screen.getByLabelText('Recipe Title'), exampleRecipe.title);
  const restored = new Event('beforeunload', { cancelable: true });
  window.dispatchEvent(restored);
  expect(restored.defaultPrevented).toBe(false);
});
it('previews the URL, handles broken images, and lets the creator clear it', async () => {
  editor();
  const image = screen.getByRole('img', { name: 'Recipe photo preview' });
  expect(image).toHaveAttribute('src', exampleRecipe.image);
  fireEvent.error(image);
  expect(screen.getByRole('status')).toHaveTextContent('image couldn’t be loaded');
  await userEvent.clear(screen.getByLabelText('Image URL'));
  await userEvent.type(screen.getByLabelText('Image URL'), 'https://example.com/new.jpg');
  expect(screen.getByRole('img', { name: 'Recipe photo preview' })).toHaveAttribute('src', 'https://example.com/new.jpg');
  await userEvent.click(screen.getByRole('button', { name: 'Clear Image' }));
  expect(screen.getByLabelText('Image URL')).toHaveValue('');
  expect(screen.queryByRole('img')).not.toBeInTheDocument();
});
