import { expect, test } from '../fixtures';

test.describe('authenticated session', () => {
  test('session persists across reload', async ({ pages: { header, page } }) => {
    await test.step('load home as authenticated user', async () => {
      await page.goto('/');
      await expect(header.userMenu).toBeVisible();
    });

    await test.step('reload preserves the session', async () => {
      await page.reload();
      await expect(header.userMenu).toBeVisible();
      expect(page.url()).not.toContain('/login');
    });
  });
});

test.describe('logout flow', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('logout returns to /login and clears the session', async ({ pages: { loginPage, header, page } }) => {
    await test.step('log in with demo credentials', async () => {
      await loginPage.goto();
      await loginPage.login('demo', 'demo');
      await expect(header.userMenu).toBeVisible();
    });

    await test.step('log out from the header menu', async () => {
      await header.logout();
    });

    await test.step('lands on /login and stays there after reload', async () => {
      await expect(page).toHaveURL(/\/login/);
      await page.reload();
      await expect(page).toHaveURL(/\/login/);
    });
  });
});
