import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import { AuthProvider } from '../auth/AuthProvider';
import { SESSION_KEY } from '../auth/session';
import { AccountMenu } from './AccountMenu';
import { ProtectedRoute } from './ProtectedRoute';

function setup(signedIn = true, initialEntry = '/recipes') {
  if (signedIn) {
    const payload = btoa(JSON.stringify({ user: { _id: 'u1', email: 'cook@example.com' }, exp: Math.floor(Date.now() / 1000) + 3600 }));
    sessionStorage.setItem(SESSION_KEY, `header.${payload}.signature`);
  }
  render(<MemoryRouter initialEntries={[initialEntry]}><AuthProvider>
    <AccountMenu iconSrc="/test-account.svg" />
    <button type="button">Outside</button>
    <Routes>
      <Route path="/recipes" element={<h1>Recipe List</h1>} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<h1>Your Recipes</h1>} />
      </Route>
      <Route path="/login" element={<h1>Login destination</h1>} />
      <Route path="/profile" element={<h1>Profile destination</h1>} />
      <Route path="/ai-assistant" element={<h1>AI Assistant</h1>} />
      <Route path="/" element={<h1>Home page</h1>} />
    </Routes>
  </AuthProvider></MemoryRouter>);
  return userEvent.setup();
}

it('discloses account information and closes after dashboard navigation', async () => {
  const user = setup();
  const trigger = screen.getByRole('button', { name: 'Main menu' });
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  expect(screen.queryByText('cook@example.com')).not.toBeInTheDocument();
  await user.click(trigger);
  expect(trigger).toHaveAttribute('aria-expanded', 'true');
  expect(screen.getByText('cook@example.com')).toBeInTheDocument();
  await user.click(screen.getByRole('link', { name: 'Dashboard' }));
  expect(screen.getByRole('heading', { name: 'Your Recipes' })).toBeInTheDocument();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('opens Your Profile from the creator menu and closes the dropdown', async () => {
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Main menu' }));
  await user.click(screen.getByRole('link', { name: 'Your Profile' }));
  expect(screen.getByRole('heading', { name: 'Profile destination' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Main menu' })).toHaveAttribute('aria-expanded', 'false');
});

it('closes on Escape, restores focus, and closes on an outside click', async () => {
  const user = setup();
  const trigger = screen.getByRole('button', { name: 'Main menu' });
  await user.click(trigger);
  await user.tab();
  await user.keyboard('{Escape}');
  expect(trigger).toHaveFocus();
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
  await user.click(trigger);
  await user.click(screen.getByRole('button', { name: 'Outside' }));
  expect(trigger).toHaveAttribute('aria-expanded', 'false');
});

it('logs out and replaces creator actions with guest actions', async () => {
  const user = setup();
  await user.click(screen.getByRole('button', { name: 'Main menu' }));
  await user.click(screen.getByRole('button', { name: 'Log Out' }));
  expect(screen.getByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  expect(screen.getByRole('button', { name: 'Main menu' })).toHaveAttribute('aria-expanded', 'false');
  await user.click(screen.getByRole('button', { name: 'Main menu' }));
  expect(screen.getByRole('link', { name: 'Login' })).toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  expect(screen.queryByRole('link', { name: 'Your Profile' })).not.toBeInTheDocument();
  expect(screen.queryByText('cook@example.com')).not.toBeInTheDocument();
});
it('logs out from the protected dashboard to Home without an intermediate Login redirect', async () => {
  const user = setup(true, '/dashboard');
  await user.click(screen.getByRole('button', { name: 'Main menu' }));
  await user.click(screen.getByRole('button', { name: 'Log Out' }));
  expect(await screen.findByRole('heading', { name: 'Home page' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'Login destination' })).not.toBeInTheDocument();
  expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
});

it('lets guests discover every public feature and sign-in route', async () => {
  const user = setup(false);
  await user.click(screen.getByRole('button', { name: 'Main menu' }));
  expect(screen.getByRole('link', { name: 'Browse Recipes' })).toHaveAttribute('href', '/recipes');
  expect(screen.getByRole('link', { name: 'AI Assistant' })).toHaveAttribute('href', '/ai-assistant');
  expect(screen.getByRole('link', { name: 'Recipe Generator' })).toHaveAttribute('href', '/recipe-generator');
  expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: 'Create Account' })).toHaveAttribute('href', '/signup');
  expect(screen.queryByRole('link', { name: 'Dashboard' })).not.toBeInTheDocument();
  expect(screen.queryByText('cook@example.com')).not.toBeInTheDocument();
});

it('lets a guest navigate to the AI assistant by keyboard and closes the panel', async () => {
  const user = setup(false);
  await user.tab();
  await user.keyboard('{Enter}');
  await user.tab();
  await user.tab();
  expect(screen.getByRole('link', { name: 'AI Assistant' })).toHaveFocus();
  await user.keyboard('{Enter}');
  expect(screen.getByRole('heading', { name: 'AI Assistant' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Main menu' })).toHaveAttribute('aria-expanded', 'false');
});
