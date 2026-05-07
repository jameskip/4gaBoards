import { expect, test } from '../fixtures';

test.describe('login flow', () => {
  test.beforeEach(async ({ pages: { loginPage } }) => {
    await loginPage.goto();
  });

  test('valid credentials redirect away from /login', async ({ pages: { loginPage, header, page } }) => {
    await test.step('submit valid credentials', async () => {
      await loginPage.login('demo', 'demo');
    });

    await test.step('redirects off /login and shows the user menu', async () => {
      await expect(page).not.toHaveURL(/\/login/);
      await expect(header.userMenu).toBeVisible();
    });
  });

  test('invalid credentials show an error and stay on /login', async ({ pages: { loginPage, page } }) => {
    await test.step('submit invalid credentials', async () => {
      await loginPage.login(`nope${Math.random().toString(36).slice(2, 10)}`, 'whatever');
    });

    await test.step('error is shown and URL still contains /login', async () => {
      await expect(loginPage.error).toBeVisible();
      expect(page.url()).toContain('/login');
    });
  });
});
