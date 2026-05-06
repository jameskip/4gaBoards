import { expect, test } from '../fixtures';

test.describe('login flow', () => {
  test.beforeEach(async ({ pages: { loginPage } }) => {
    await loginPage.goto();
  });

  test('valid credentials redirect away from /login', async ({ pages: { loginPage, header, page } }) => {
    await loginPage.login('demo', 'demo');
    await expect(page).not.toHaveURL(/\/login/);
    await expect(header.userMenu).toBeVisible();
  });

  test('invalid credentials show an error and stay on /login', async ({ pages: { loginPage, page } }) => {
    // Unique non-existent username per run (within the server's 16-char limit) so consecutive
    // runs don't share a rate-limit bucket. Re-using `demo` + wrong password trips 429 after 5/60s.
    await loginPage.login(`nope${Math.random().toString(36).slice(2, 10)}`, 'whatever');
    await expect(loginPage.error).toBeVisible();
    expect(page.url()).toContain('/login');
  });
});
