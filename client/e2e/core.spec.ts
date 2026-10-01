import { test, expect } from '@playwright/test';
import { apiURL, authHeaders, credentials, createCreator, localPhoto, login, noHorizontalOverflow, photoURL, removeRecipes, unique } from './helpers';

test('signup, login, recipe CRUD, guest search, and delete confirmation', async ({ page, request }) => {
  const user = credentials();
  let token = '';
  const ids: string[] = [];
  const title = `E2E Chickpea Stew ${unique()}`;
  const updated = `${title} Updated`;
  const tag = `e2e-tag-${unique()}`;
  const ingredient = `Chickpeas ${unique()}`;
  await localPhoto(page);
  try {
    await page.goto('/signup');
    await page.getByLabel('Username', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    const signup = page.waitForResponse(response => response.url().endsWith('/api/users/signup') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    const registered = await signup;
    expect(registered.ok()).toBeTruthy();
    ({ token } = await registered.json() as { token: string });
    await expect(page).toHaveURL(/\/dashboard$/);
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Your Recipes', exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
    await expect(page.getByText(user.email, { exact: true })).toBeVisible();
    await noHorizontalOverflow(page);
    await page.getByRole('link', { name: 'Dashboard', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Main menu', exact: true })).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
    await page.getByRole('button', { name: 'Log Out' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.goto('/login');
    await page.getByLabel('Email', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill('Wrong-password-123!');
    await page.getByRole('button', { name: 'Login', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('incorrect');
    await login(page, user);

    await page.getByRole('link', { name: 'Create Recipe', exact: true }).click();
    await page.getByRole('button', { name: 'Create Recipe', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('highlighted fields');
    await page.getByLabel('Recipe Title', { exact: true }).fill(title);
    await page.getByLabel('Description (optional)', { exact: true }).fill('A browser test recipe.');
    await page.getByLabel('Image URL', { exact: true }).fill(photoURL);
    await page.getByLabel('Ingredient 1', { exact: true }).fill(ingredient);
    await page.getByLabel('Quantity 1', { exact: true }).fill('1 cup');
    await page.getByRole('button', { name: 'Add Ingredient', exact: true }).click();
    await page.getByLabel('Ingredient 2', { exact: true }).fill('Tomatoes');
    await page.getByLabel('Quantity 2', { exact: true }).fill('2');
    await page.getByLabel('Step 1', { exact: true }).fill('Combine the ingredients.');
    await page.getByRole('button', { name: 'Add Step', exact: true }).click();
    await page.getByLabel('Step 2', { exact: true }).fill('Simmer until cooked.');
    await page.getByLabel('Tags (optional)', { exact: true }).fill(`vegan, ${tag}`);
    await noHorizontalOverflow(page);
    const created = page.waitForResponse(response => response.url().endsWith('/api/recipes') && response.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create Recipe', exact: true }).click();
    const response = await created;
    expect(response.status()).toBe(201);
    const recipe = await response.json() as { _id: string };
    ids.push(recipe._id);
    await expect(page.getByText('Recipe created successfully.', { exact: true })).toBeVisible();
    const card = page.getByRole('article').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'Edit', exact: true }).click();
    await expect(page.getByLabel('Recipe Title', { exact: true })).toHaveValue(title);
    await expect(page.getByLabel('Ingredient 2', { exact: true })).toHaveValue('Tomatoes');
    await page.getByLabel('Recipe Title', { exact: true }).fill(updated);
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    await expect(page.getByText('Recipe updated successfully.', { exact: true })).toBeVisible();

    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
    await page.getByRole('button', { name: 'Log Out' }).click();
    await page.goto('/recipes');
    const search = page.getByLabel('Search recipes', { exact: true });
    for (const query of [updated, tag, ingredient]) {
      await search.fill(query);
      await expect(page.getByRole('heading', { name: updated, exact: true })).toBeVisible();
    }
    await search.fill(`unmatched-${unique()}`);
    await expect(page.getByText('We couldn’t find any recipes.', { exact: true })).toBeVisible();
    await search.fill(updated);
    await page.getByRole('heading', { name: updated, exact: true }).getByRole('link').click();
    await expect(page.getByRole('heading', { name: updated, exact: true })).toBeVisible();
    await expect(page.getByText(`1 cup ${ingredient}`, { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Edit Recipe', exact: true })).toHaveCount(0);
    await noHorizontalOverflow(page);

    await login(page, user);
    const updatedCard = page.getByRole('article').filter({ has: page.getByRole('heading', { name: updated, exact: true }) });
    await updatedCard.getByRole('button', { name: 'Delete', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete recipe?', exact: true });
    await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: 'Nevermind', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(updatedCard).toBeVisible();
    await updatedCard.getByRole('button', { name: 'Delete', exact: true }).click();
    await dialog.getByRole('button', { name: 'Yes, Delete Recipe', exact: true }).click();
    await expect(page.getByText('Recipe deleted successfully.', { exact: true })).toBeVisible();
    await expect(updatedCard).toHaveCount(0);
    const missing = await request.get(`${apiURL}/api/recipes/${recipe._id}`);
    expect(missing.status()).toBe(404);
    await page.goto('/recipes');
    await search.fill(updated);
    await expect(page.getByText('We couldn’t find any recipes.', { exact: true })).toBeVisible();
  } finally { if (token) await removeRecipes(request, token, ids); }
});

test('a second creator cannot edit or delete another creator’s recipe', async ({ page, request }) => {
  const owner = await createCreator(request);
  const other = await createCreator(request);
  const title = `Owned recipe ${unique()}`;
  const create = await request.post(`${apiURL}/api/recipes`, { headers: authHeaders(owner.token), data: {
    title, image: photoURL, ingredients: [{ name: 'Chickpeas', quantity: '1 cup' }],
    instructions: [{ step: 1, description: 'Simmer.' }], tags: ['vegan'],
  } });
  expect(create.status()).toBe(201);
  const recipe = await create.json() as { _id: string };
  await localPhoto(page);
  try {
    await login(page, other);
    await expect(page.getByRole('heading', { name: title, exact: true })).toHaveCount(0);
    await page.goto(`/recipes/${recipe._id}`);
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Edit Recipe', exact: true })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    await page.goto(`/recipes/${recipe._id}/edit`);
    await expect(page.getByRole('alert')).toContainText('Only the creator');
    const edit = await request.put(`${apiURL}/api/recipes/${recipe._id}`, { headers: authHeaders(other.token), data: { title: 'Unauthorized change' } });
    expect(edit.status()).toBe(403);
    const deletion = await request.delete(`${apiURL}/api/recipes/${recipe._id}`, { headers: authHeaders(other.token) });
    expect(deletion.status()).toBe(403);
    const transfer = await request.put(`${apiURL}/api/recipes/${recipe._id}`, { headers: authHeaders(owner.token), data: { title, ownerId: other.id } });
    expect(transfer.status()).toBe(200);
    const unchanged = await transfer.json() as { ownerId: string; title: string };
    expect(unchanged.ownerId).toBe(owner.id);
    expect(unchanged.title).toBe(title);
  } finally { await removeRecipes(request, owner.token, [recipe._id]); }
});

test('guest routes, protected routes, missing recipes, and unauthenticated API writes', async ({ page, request }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Explore Recipes', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Recipe List', exact: true })).toBeVisible();
  await noHorizontalOverflow(page);
  for (const path of ['/dashboard', '/profile', '/recipes/new', '/recipes/ffffffffffffffffffffffff/edit']) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login$/);
  }
  let recoveryRequests = 0;
  page.on('request', event => {
    if (event.method() === 'POST' && event.url().includes('/api/users/')) recoveryRequests++;
  });
  await page.getByLabel('Email', { exact: true }).fill('recovery-check@example.com');
  await page.getByLabel('Password', { exact: true }).fill('Existing-password-123!');
  const recoveryLink = page.getByRole('button', { name: 'Forgot Password?', exact: true });
  await recoveryLink.click();
  const recovery = page.getByRole('dialog', { name: 'Password recovery', exact: true });
  await expect(recovery).toBeVisible();
  await expect(recovery).toContainText('Password recovery is currently unavailable.');
  await noHorizontalOverflow(page);
  await page.keyboard.press('Escape');
  await expect(recovery).toHaveCount(0);
  await expect(recoveryLink).toBeFocused();
  await expect(page.getByLabel('Email', { exact: true })).toHaveValue('recovery-check@example.com');
  await expect(page.getByLabel('Password', { exact: true })).toHaveValue('Existing-password-123!');
  await recoveryLink.click();
  await recovery.getByRole('link', { name: 'Create an Account', exact: true }).click();
  await expect(page).toHaveURL(/\/signup$/);
  await expect(page.getByRole('heading', { name: 'Create an Account', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Forgot Password?', exact: true })).toHaveCount(0);
  expect(recoveryRequests).toBe(0);
  const id = unique().replaceAll('-', '').slice(0, 24);
  await page.goto(`/recipes/${id}`);
  await expect(page.getByRole('heading', { name: 'Recipe unavailable', exact: true })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('no longer available');
  for (const method of ['POST', 'PUT', 'DELETE']) {
    const path = method === 'POST' ? '/api/recipes' : `/api/recipes/${id}`;
    const response = await request.fetch(`${apiURL}${path}`, { method, data: { title: 'Unauthenticated' } });
    expect(response.status()).toBe(401);
  }
});
