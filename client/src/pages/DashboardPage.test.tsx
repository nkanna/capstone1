import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { beforeEach, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { api } from '../lib/api';
import { exampleRecipe, logIn } from '../test/recipeFixtures';
import { DashboardPage } from './DashboardPage';
beforeEach(() => {
  // jsdom has no browser dialog implementation; assert confirmation behavior here.
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
function dashboard() {
  logIn();
  vi.spyOn(api, 'get').mockResolvedValue({ data: [exampleRecipe, { ...exampleRecipe, _id: 'other', ownerId: 'other-cook', title: 'Other Recipe' }] });
  render(<MemoryRouter><AuthProvider><DashboardPage /></AuthProvider></MemoryRouter>);
}
it('keeps the full-screen brand visible until recipes load and shows an error when loading fails', async () => {
  logIn();
  let reject!: (reason: unknown) => void;
  vi.spyOn(api, 'get').mockImplementationOnce(() => new Promise((_resolve, fail) => { reject = fail; }));
  render(<MemoryRouter><AuthProvider><DashboardPage /></AuthProvider></MemoryRouter>);
  expect(screen.getByRole('status')).toHaveTextContent('Loading. Please wait.');
  expect(screen.queryByRole('heading', { name: 'Your Recipes' })).not.toBeInTheDocument();
  await act(async () => reject(new Error('Offline')));
  expect(await screen.findByRole('alert')).toHaveTextContent('couldn’t load');
  expect(screen.getByRole('button', { name: 'Try Again' })).toBeEnabled();
});
it('shows only owned recipes and requires confirmation before deleting', async () => {
  const remove = vi.spyOn(api, 'delete').mockResolvedValue({ data: { message: 'Deleted Recipe' } });
  dashboard();
  await screen.findByRole('heading', { name: 'Chickpea Stew' });
  expect(screen.queryByRole('heading', { name: 'Other Recipe' })).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  expect(remove).not.toHaveBeenCalled();
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Nevermind' }));
  expect(remove).not.toHaveBeenCalled();
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, Delete Recipe' }));
  expect(await screen.findByText('Recipe deleted successfully.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Chickpea Stew' })).not.toBeInTheDocument();
  expect(remove).toHaveBeenCalledWith(`/api/recipes/${exampleRecipe._id}`);
});
it('keeps the recipe visible when deletion is forbidden', async () => {
  vi.spyOn(api, 'delete').mockRejectedValue({ isAxiosError: true, response: { status: 403 } });
  dashboard();
  await screen.findByRole('heading', { name: 'Chickpea Stew' });
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, Delete Recipe' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Only the creator');
  expect(screen.getByRole('heading', { name: 'Chickpea Stew' })).toBeInTheDocument();
});
it('removes a stale card when the backend reports it was already deleted', async () => {
  vi.spyOn(api, 'delete').mockRejectedValue({ isAxiosError: true, response: { status: 404 } });
  dashboard();
  await screen.findByRole('heading', { name: 'Chickpea Stew' });
  await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
  await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Yes, Delete Recipe' }));
  expect(await screen.findByText('This recipe was already removed.')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Chickpea Stew' })).not.toBeInTheDocument();
});
