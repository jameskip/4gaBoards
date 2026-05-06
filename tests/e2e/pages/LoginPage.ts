import { expect, Locator, Page } from '@playwright/test';

export class LoginPage {
  readonly username: Locator;
  readonly password: Locator;
  readonly submit: Locator;
  readonly error: Locator;

  constructor(readonly page: Page) {
    this.username = page.locator('input[name="emailOrUsername"]');
    this.password = page.locator('input[name="password"]');
    this.submit = page.getByRole('button', { name: 'Log in' });
    this.error = page.getByText('Invalid username or password');
  }

  async goto() {
    await this.page.goto('/login');
    await expect(this.submit).toBeVisible();
  }

  async login(user: string, pass: string) {
    await this.username.fill(user);
    await this.password.fill(pass);
    await this.submit.click();
  }
}
