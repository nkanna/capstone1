import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { SESSION_KEY } from '../auth/session';
import { ProtectedRoute } from './ProtectedRoute';

function renderDashboard() {
  render(<MemoryRouter initialEntries={['/dashboard']}><AuthProvider><Routes>
    <Route path="/login" element={<h1>Login page</h1>} />
    <Route element={<ProtectedRoute />}><Route path="/dashboard" element={<h1>Private dashboard</h1>} /></Route>
  </Routes></AuthProvider></MemoryRouter>);
}

it('redirects guests to login when they open a protected URL', () => {
  renderDashboard();
  expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Private dashboard' })).not.toBeInTheDocument();
});

it('rejects an expired stored session', () => {
  const payload = btoa(JSON.stringify({ user: { _id: 'u1' }, exp: 1 }));
  sessionStorage.setItem(SESSION_KEY, `header.${payload}.signature`);
  renderDashboard();
  expect(screen.getByRole('heading', { name: 'Login page' })).toBeInTheDocument();
});

it('allows a valid stored session through a refreshed protected URL', () => {
  const payload = btoa(JSON.stringify({ user: { _id: 'u1' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
  sessionStorage.setItem(SESSION_KEY, `header.${payload}.signature`);
  renderDashboard();
  expect(screen.getByRole('heading', { name: 'Private dashboard' })).toBeInTheDocument();
});
