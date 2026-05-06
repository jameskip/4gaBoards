import { expect, test } from '../fixtures';

test.describe('authenticated session', () => {
  test('session persists across reload', async ({ pages: { header, page } }) => {
    await page.goto('/');
    await expect(header.userMenu).toBeVisible();
    await page.reload();
    await expect(header.userMenu).toBeVisible();
    expect(page.url()).not.toContain('/login');
  });
});

test.describe('logout flow', () => {
  // Empty storageState so this test gets its own ephemeral session. The DELETE /access-tokens/me
  // call would otherwise invalidate the shared user.json token used by every other worker.
  test.use({ storageState: { cookies: [], origins: [] } });

  test('logout returns to /login and clears the session', async ({ pages: { loginPage, header, page } }) => {
    await loginPage.goto();
    await loginPage.login('demo', 'demo');
    await expect(header.userMenu).toBeVisible();

    await header.logout();

    await expect(page).toHaveURL(/\/login/);
    await page.reload();
    await expect(page).toHaveURL(/\/login/);
  });
});
