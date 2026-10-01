import { test, expect } from '@playwright/test';
import { apiURL, authHeaders, credentials, createCreator, localPhoto, login, noHorizontalOverflow, photoURL, unique } from './helpers';

test('signup shows the brand loading screen until the real account and dashboard requests finish', async ({ page, request }) => {
  const user = credentials();
  let releaseSignup!: () => void;
  const signupGate = new Promise<void>(resolve => { releaseSignup = resolve; });
  let releaseRecipes!: () => void;
  const recipeGate = new Promise<void>(resolve => { releaseRecipes = resolve; });
  let token = '';
  await page.route('**/api/users/signup', async route => { await signupGate; await route.continue(); });
  await page.route('**/api/recipes', async route => {
    if (route.request().method() === 'GET') await recipeGate;
    await route.continue();
  });
  try {
    await page.goto('/signup');
    await page.getByLabel('Username', { exact: true }).fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    const response = page.waitForResponse(value => value.url().endsWith('/api/users/signup') && value.request().method() === 'POST');
    await page.getByRole('button', { name: 'Create Account', exact: true }).click();
    await expect(page.getByRole('status')).toHaveText('Loading. Please wait.');
    await expect(page.getByRole('img', { name: 'Spoonful', exact: true })).toBeVisible();
    await expect(page.getByLabel('Username', { exact: true })).toHaveCount(0);
    await noHorizontalOverflow(page);
    releaseSignup();
    const registered = await response;
    expect(registered.status()).toBe(200);
    ({ token } = await registered.json() as { token: string });
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByRole('status')).toHaveText('Loading. Please wait.');
    await expect(page.getByRole('heading', { name: 'Your Recipes', exact: true })).toHaveCount(0);
    releaseRecipes();
    await expect(page.getByRole('heading', { name: 'Your Recipes', exact: true })).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Loading. Please wait.' })).toHaveCount(0);
  } finally {
    releaseSignup(); releaseRecipes();
    if (token) {
      const deletion = await request.delete(`${apiURL}/api/account`, { headers: authHeaders(token), data: { currentPassword: user.password } });
      expect([200, 401]).toContain(deletion.status());
    }
  }
});

test('Your Profile saves credentials, confirms account deletion and revokes old tokens without deleting another creator', async ({ page, request }) => {
  const owner = await createCreator(request);
  const other = await createCreator(request);
  let password = owner.password;
  let token = owner.token;
  let deleted = false;
  const updatedEmail = `profile-${unique()}@example.test`;
  const newPassword = `Updated-${unique()}!`;
  try {
    await localPhoto(page);
    const ownRecipe = await request.post(`${apiURL}/api/recipes`, { headers: authHeaders(token), data: {
      title: `Profile cleanup ${unique()}`, image: photoURL, ingredients: [{ name: 'Chickpeas', quantity: '1 cup' }], instructions: [{ step: 1, description: 'Simmer.' }],
    } });
    expect(ownRecipe.status(), await ownRecipe.text()).toBe(201);
    const recipe = await ownRecipe.json() as { _id: string };
    const otherRecipe = await request.post(`${apiURL}/api/recipes`, { headers: authHeaders(other.token), data: {
      title: `Another creator ${unique()}`, image: photoURL, ingredients: [{ name: 'Lentils', quantity: '1 cup' }], instructions: [{ step: 1, description: 'Simmer.' }],
    } });
    expect(otherRecipe.status(), await otherRecipe.text()).toBe(201);
    const preserved = await otherRecipe.json() as { _id: string };
    const unauthorized = await request.delete(`${apiURL}/api/account`, { data: { currentPassword: password } });
    expect(unauthorized.status()).toBe(401);
    const account = await request.get(`${apiURL}/api/account`, { headers: authHeaders(token) });
    expect(account.status()).toBe(200);
    expect(await account.json()).not.toHaveProperty('password');
    const wrongPassword = await request.put(`${apiURL}/api/account`, { headers: authHeaders(token), data: { email: updatedEmail, currentPassword: 'wrong-password' } });
    expect(wrongPassword.status()).toBe(403);
    const conflict = await request.put(`${apiURL}/api/account`, { headers: authHeaders(token), data: { email: other.email, currentPassword: password } });
    expect(conflict.status()).toBe(409);
    await login(page, owner);
    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
    await page.getByRole('link', { name: 'Your Profile', exact: true }).click();
    await expect(page).toHaveURL(/\/profile$/);
    await expect(page.getByLabel('Username', { exact: true })).toHaveValue(owner.email);
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
    await noHorizontalOverflow(page);
    await page.getByLabel('Username', { exact: true }).fill(updatedEmail);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByText('Change password', { exact: true }).click();
    await page.getByLabel('New password', { exact: true }).fill(newPassword);
    const save = page.waitForResponse(value => value.url().endsWith('/api/account') && value.request().method() === 'PUT');
    await page.getByRole('button', { name: 'Save Changes', exact: true }).click();
    const saved = await save;
    expect(saved.status()).toBe(200);
    ({ token } = await saved.json() as { token: string });
    password = newPassword;
    await expect(page.getByText('Your profile info was successfully updated.', { exact: true })).toBeVisible();
    const oldCredentials = await request.post(`${apiURL}/api/users/login`, { data: { email: owner.email, password: owner.password } });
    expect(oldCredentials.status()).toBe(401);
    await page.getByRole('button', { name: 'Main menu', exact: true }).click();
    await page.getByRole('button', { name: 'Log Out', exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    expect(await page.evaluate(() => sessionStorage.getItem('spoonful.token'))).toBeNull();
    await login(page, { email: updatedEmail, password });
    await page.goto('/profile');
    const trigger = page.getByRole('button', { name: 'Delete Account', exact: true });
    await trigger.click();
    const dialog = page.getByRole('dialog', { name: 'Delete account?', exact: true });
    await dialog.getByRole('button', { name: 'Yes, Delete Account', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('current password');
    await dialog.getByRole('button', { name: 'Nevermind', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(trigger).toBeFocused();
    expect((await request.get(`${apiURL}/api/account`, { headers: authHeaders(token) })).status()).toBe(200);
    await trigger.click();
    await dialog.getByLabel('Current password', { exact: true }).fill('wrong-password');
    await dialog.getByRole('button', { name: 'Yes, Delete Account', exact: true }).click();
    await expect(dialog.getByRole('alert')).toContainText('incorrect');
    await noHorizontalOverflow(page);
    await dialog.getByLabel('Current password', { exact: true }).fill(password);
    const removal = page.waitForResponse(value => value.url().endsWith('/api/account') && value.request().method() === 'DELETE');
    await dialog.getByRole('button', { name: 'Yes, Delete Account', exact: true }).click();
    expect((await removal).status()).toBe(200); deleted = true;
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByText('Your account and recipes were deleted.', { exact: true })).toBeVisible();
    expect(await page.evaluate(() => sessionStorage.getItem('spoonful.token'))).toBeNull();
    expect((await request.get(`${apiURL}/api/recipes/${recipe._id}`)).status()).toBe(404);
    for (const oldToken of [owner.token, token]) {
      expect((await request.get(`${apiURL}/api/account`, { headers: authHeaders(oldToken) })).status()).toBe(401);
      expect((await request.post(`${apiURL}/api/recipes`, { headers: authHeaders(oldToken), data: {
        title: 'Should not be created', image: photoURL, ingredients: [{ name: 'Chickpeas', quantity: '1 cup' }], instructions: [{ step: 1, description: 'Simmer.' }],
      } })).status()).toBe(401);
    }
    const deletedLogin = await request.post(`${apiURL}/api/users/login`, { data: { email: updatedEmail, password } });
    expect(deletedLogin.status()).toBe(401);
    expect((await request.get(`${apiURL}/api/account`, { headers: authHeaders(other.token) })).status()).toBe(200);
    expect((await request.get(`${apiURL}/api/recipes/${preserved._id}`)).status()).toBe(200);
    await page.goto('/profile'); await expect(page).toHaveURL(/\/login$/);
  } finally {
    if (!deleted) {
      const cleanup = await request.delete(`${apiURL}/api/account`, { headers: authHeaders(token), data: { currentPassword: password } });
      expect([200, 401]).toContain(cleanup.status());
    }
    const cleanup = await request.delete(`${apiURL}/api/account`, { headers: authHeaders(other.token), data: { currentPassword: other.password } });
    expect([200, 401]).toContain(cleanup.status());
  }
});
