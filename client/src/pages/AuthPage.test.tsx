import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it, vi } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { SESSION_KEY } from '../auth/session';
import { api } from '../lib/api';
import { AuthPage } from './AuthPage';

function renderAuth(mode: 'login' | 'signup') {
  render(<MemoryRouter initialEntries={[`/${mode}`]}><AuthProvider><Routes>
    <Route path={`/${mode}`} element={<AuthPage mode={mode} />} />
    <Route path="/dashboard" element={<h1>Private dashboard</h1>} />
  </Routes></AuthProvider></MemoryRouter>);
}

it('rejects invalid signup inputs without sending a request', async () => {
  const post = vi.spyOn(api, 'post');
  renderAuth('signup');
  await userEvent.type(screen.getByLabelText('Username'), 'invalid');
  await userEvent.type(screen.getByLabelText('Password'), 'short');
  await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
  expect(screen.getByText('Please add a password with at least 8 characters.')).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();
});

it('posts login credentials, stores the token, and opens the dashboard', async () => {
  const payload = btoa(JSON.stringify({ user: { _id: 'u1', email: 'cook@example.com' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const token = `header.${payload}.signature`;
  const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { token } });
  renderAuth('login');
  await userEvent.type(screen.getByLabelText('Email'), 'cook@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'long-password');
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByRole('heading', { name: 'Private dashboard' })).toBeInTheDocument();
  expect(post).toHaveBeenCalledWith('/api/users/login', { email: 'cook@example.com', password: 'long-password' });
  expect(sessionStorage.getItem(SESSION_KEY)).toBe(token);
});

it('uses the signup endpoint and opens the dashboard on successful signup', async () => {
  const payload = btoa(JSON.stringify({ user: { _id: 'u1', email: 'cook@example.com' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
  const post = vi.spyOn(api, 'post').mockResolvedValue({ data: { token: `header.${payload}.signature` } });
  renderAuth('signup');
  await userEvent.type(screen.getByLabelText('Username'), 'cook@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'long-password');
  await userEvent.click(screen.getByRole('button', { name: 'Create Account' }));
  expect(await screen.findByRole('heading', { name: 'Private dashboard' })).toBeInTheDocument();
  expect(post).toHaveBeenCalledWith('/api/users/signup', { email: 'cook@example.com', password: 'long-password' });
});

it('shows rejected credentials without creating a session', async () => {
  vi.spyOn(api, 'post').mockRejectedValue({ isAxiosError: true, response: { status: 401, data: { err: 'bad credentials' } } });
  renderAuth('login');
  await userEvent.type(screen.getByLabelText('Email'), 'cook@example.com');
  await userEvent.type(screen.getByLabelText('Password'), 'wrong-password');
  await userEvent.click(screen.getByRole('button', { name: 'Login' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Your email or password is incorrect.');
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  expect(screen.getByRole('button', { name: 'Login' })).toBeEnabled();
});
