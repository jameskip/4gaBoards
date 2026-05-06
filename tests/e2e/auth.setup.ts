import { expect, test as setup } from './fixtures';

const authFile = 'playwright/.auth/user.json';

setup('authenticate as demo user', async ({ pages: { loginPage, page } }) => {
  await loginPage.goto();
  await loginPage.login('demo', 'demo');
  await expect(page).not.toHaveURL(/\/login/);
  await page.context().storageState({ path: authFile });
});
