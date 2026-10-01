import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { expect, it } from 'vitest';
import { LandingPage } from './LandingPage';

it('lets a guest navigate directly from the landing page to recipes', async () => {
  render(<MemoryRouter><Routes>
    <Route path="/" element={<LandingPage />} />
    <Route path="/recipes" element={<h1>Public recipes</h1>} />
  </Routes></MemoryRouter>);
  expect(screen.getByRole('link', { name: 'Login' })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: 'Create an Account' })).toHaveAttribute('href', '/signup');
  await userEvent.click(screen.getByRole('link', { name: 'Explore Recipes' }));
  expect(screen.getByRole('heading', { name: 'Public recipes' })).toBeInTheDocument();
});
