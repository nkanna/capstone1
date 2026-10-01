import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { beforeAll, expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { SESSION_KEY } from '../auth/session';
import { api } from '../lib/api';
import { logIn } from '../test/recipeFixtures';
import { ProfilePage } from './ProfilePage';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { LandingPage } from './LandingPage';

beforeAll(() => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function(this: HTMLDialogElement) { this.setAttribute('open', ''); } });
  Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function(this: HTMLDialogElement) { this.removeAttribute('open'); } });
});
function setup() {
  logIn();
  vi.spyOn(api, 'get').mockResolvedValue({ data: { _id: 'cook-1', email: 'cook@example.com' } });
  render(<MemoryRouter initialEntries={['/profile']}><AuthProvider><Routes>
    <Route element={<ProtectedRoute />}>
      <Route path="/profile" element={<ProfilePage />} />
      <Route path="/dashboard" element={<h1>Dashboard destination</h1>} />
    </Route>
    <Route path="/login" element={<h1>Login destination</h1>} />
    <Route path="/" element={<LandingPage />} />
  </Routes></AuthProvider></MemoryRouter>);
  return userEvent.setup();
}
it('loads the real account email without exposing a stored password', async () => {
  setup();
  expect(await screen.findByLabelText('Username')).toHaveValue('cook@example.com');
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('');
});
it('does not delete on opening, empty submission, cancellation, or Escape', async () => {
  const remove = vi.spyOn(api, 'delete');
  const user = setup();
  const trigger = await screen.findByRole('button', { name: 'Delete Account' });
  await user.click(trigger);
  let modal = screen.getByRole('dialog', { name: 'Delete account?' });
  await user.click(within(modal).getByRole('button', { name: 'Yes, Delete Account' }));
  expect(screen.getByRole('alert')).toHaveTextContent('Enter your current password');
  expect(remove).not.toHaveBeenCalled();
  await user.click(within(modal).getByRole('button', { name: 'Nevermind' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(trigger).toHaveFocus();
  await user.click(trigger);
  modal = screen.getByRole('dialog');
  fireEvent(modal, new Event('cancel', { cancelable: true }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();
});
it('keeps the session and dialog on a wrong password and allows a successful retry', async () => {
  const remove = vi.spyOn(api, 'delete').mockRejectedValueOnce({ isAxiosError: true, response: { status: 403, data: { message: 'Your current password is incorrect. Please try again.' } } }).mockResolvedValueOnce({ data: { message: 'Deleted' } });
  const user = setup();
  await user.click(await screen.findByRole('button', { name: 'Delete Account' }));
  const modal = screen.getByRole('dialog');
  const password = within(modal).getByLabelText('Current password');
  await user.type(password, 'wrong-password');
  await user.click(within(modal).getByRole('button', { name: 'Yes, Delete Account' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('incorrect');
  expect(sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
  await user.clear(password); await user.type(password, 'correct-password');
  await user.click(within(modal).getByRole('button', { name: 'Yes, Delete Account' }));
  expect(await screen.findByRole('heading', { name: 'Spoonful' })).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('Your account and recipes were deleted.');
  expect(screen.queryByRole('heading', { name: 'Login destination' })).not.toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  expect(remove).toHaveBeenLastCalledWith('/api/account', { data: { currentPassword: 'correct-password' } });
});
it('logs out from the protected profile to Home without the Login guard taking over', async () => {
  const user = setup();
  await screen.findByLabelText('Username');
  await user.click(screen.getByRole('button', { name: 'Log Out' }));
  expect(await screen.findByRole('heading', { name: 'Spoonful' })).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  expect(screen.queryByRole('heading', { name: 'Login destination' })).not.toBeInTheDocument();
});
it('rejects saving without reauthentication and refreshes the session after a valid update', async () => {
  const payload = btoa(JSON.stringify({ user: { _id: 'cook-1', email: 'updated@example.com' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const token = `header.${payload}.signature`;
  const put = vi.spyOn(api, 'put').mockResolvedValue({ data: { token } });
  const user = setup();
  await screen.findByLabelText('Username');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(screen.getByRole('alert')).toHaveTextContent('current password');
  expect(put).not.toHaveBeenCalled();
  await user.clear(screen.getByLabelText('Username')); await user.type(screen.getByLabelText('Username'), 'updated@example.com');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'correct-password');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('heading', { name: 'Dashboard destination' })).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBe(token);
  expect(put).toHaveBeenCalledWith('/api/account', { email: 'updated@example.com', currentPassword: 'correct-password' });
});
it('keeps the user signed in and their edits intact when a save fails', async () => {
  vi.spyOn(api, 'put').mockRejectedValue({ isAxiosError: true, response: { status: 409, data: { message: 'An account with this email already exists.' } } });
  const user = setup();
  await screen.findByLabelText('Username');
  await user.type(screen.getByLabelText('Password', { exact: true }), 'correct-password');
  await user.click(screen.getByRole('button', { name: 'Save Changes' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('already exists');
  expect(sessionStorage.getItem(SESSION_KEY)).not.toBeNull();
  expect(screen.getByLabelText('Password', { exact: true })).toHaveValue('correct-password');
});
it('logs out when loading the account reports an expired or deleted session', async () => {
  logIn();
  vi.spyOn(api, 'get').mockRejectedValue({ isAxiosError: true, response: { status: 401 } });
  render(<MemoryRouter initialEntries={['/profile']}><AuthProvider><Routes>
    <Route path="/profile" element={<ProfilePage />} /><Route path="/login" element={<h1>Login destination</h1>} />
  </Routes></AuthProvider></MemoryRouter>);
  expect(await screen.findByRole('heading', { name: 'Login destination' })).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});
