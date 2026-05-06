import { Locator, Page } from '@playwright/test';

export class HeaderPage {
  readonly userMenu: Locator;
  readonly logoutButton: Locator;

  constructor(readonly page: Page) {
    // Locator by `title=` rather than `getByRole({ name })` because the visible text "DD"
    // (user initials) overrides `title` for accessible-name calculation.
    this.userMenu = page.locator('button[title="Profile and Settings"]');
    this.logoutButton = page.getByRole('button', { name: 'Log Out' });
  }

  async logout() {
    await this.userMenu.click();
    await this.logoutButton.click();
  }
}
