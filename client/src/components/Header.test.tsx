import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { SESSION_KEY } from '../auth/session';
import { Header } from './Header';

it('logs out, clears the stored session, and returns home', async () => {
  const payload = btoa(JSON.stringify({ user: { _id: 'u1', email: 'cook@example.com' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
  sessionStorage.setItem(SESSION_KEY, `header.${payload}.signature`);
  render(<MemoryRouter initialEntries={['/dashboard']}><AuthProvider><Routes>
    <Route path="/dashboard" element={<Header />} />
    <Route path="/" element={<h1>Home page</h1>} />
  </Routes></AuthProvider></MemoryRouter>);
  await userEvent.click(screen.getByRole('button', { name: 'Log Out' }));
  expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});
