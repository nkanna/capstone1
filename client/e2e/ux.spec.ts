import { test, expect } from '@playwright/test';
import { apiURL, authHeaders, createCreator, localPhoto, login, noHorizontalOverflow, photoURL, removeRecipes, unique } from './helpers';

test('editing previews the image and offers save, discard, and keep-editing choices', async ({ page, request }) => {
  const user = await createCreator(request);
  const title = `UX Chickpea Stew ${unique()}`;
  const created = await request.post(`${apiURL}/api/recipes`, { headers: authHeaders(user.token), data: {
    title, image: photoURL, ingredients: [{ name: 'Chickpeas', quantity: '1 cup' }],
    instructions: [{ step: 1, description: 'Simmer until tender.' }], tags: ['vegan'],
  } });
  expect(created.status()).toBe(201);
  const { _id: id } = await created.json() as { _id: string };
  await localPhoto(page);
  try {
    await login(page, user);
    await page.goto(`/recipes/${id}/edit`);
    await expect(page.getByRole('img', { name: 'Recipe photo preview' })).toBeVisible();
    await page.getByLabel('Recipe Title', { exact: true }).fill(`${title} Updated`);
    await page.getByRole('link', { name: 'Cancel', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'You have unsaved changes.' });
    await expect(dialog).toBeVisible();
    await noHorizontalOverflow(page);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByLabel('Recipe Title', { exact: true })).toHaveValue(`${title} Updated`);

    await page.getByRole('link', { name: 'Cancel', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
    await page.getByRole('link', { name: 'Cancel', exact: true }).click();
    const saved = page.waitForResponse(response => response.url().endsWith(`/api/recipes/${id}`) && response.request().method() === 'PUT');
    await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click();
    expect((await saved).ok()).toBeTruthy();
    await expect(page).toHaveURL(/\/dashboard$/);
    await expect(page.getByText('Recipe updated successfully.', { exact: true })).toBeVisible();

    await page.goto(`/recipes/${id}/edit`);
    await expect(page.getByLabel('Recipe Title', { exact: true })).toHaveValue(`${title} Updated`);
    await page.getByRole('button', { name: 'Clear Image', exact: true }).click();
    await expect(page.getByLabel('Image URL', { exact: true })).toHaveValue('');
    await page.getByRole('link', { name: 'Cancel', exact: true }).click();
    await dialog.getByRole('button', { name: 'Continue without Saving', exact: true }).click();
    await expect(page).toHaveURL(/\/dashboard$/);
    const unchanged = await request.get(`${apiURL}/api/recipes/${id}`);
    expect(unchanged.ok()).toBeTruthy();
    expect(await unchanged.json()).toMatchObject({ title: `${title} Updated`, image: photoURL });
  } finally { await removeRecipes(request, user.token, [id]); }
});
