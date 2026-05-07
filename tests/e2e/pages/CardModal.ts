import { expect, Locator, Page } from '@playwright/test';

export class CardModal {
  readonly wrapper: Locator;
  readonly title: Locator;
  readonly deleteButton: Locator;

  constructor(readonly page: Page) {
    this.wrapper = page.locator('[class*="CardModal_wrapper"]');
    this.title = this.wrapper.locator('[class*="CardModal_headerTitle"]').first();
    // `exact: true` distinguishes the trigger ("Delete Card", capital C) from the confirm
    // popup's button ("Delete card", lowercase c) — both match /Delete/i otherwise.
    this.deleteButton = page.getByRole('button', { name: 'Delete Card', exact: true });
  }

  async setTitle(value: string) {
    await this.title.click();
    const input = this.wrapper.locator('textarea, input[type="text"]').first();
    await input.fill(value);
    await input.press('Enter');
  }

  async delete() {
    await this.deleteButton.click();
    await this.page.getByRole('button', { name: 'Delete card', exact: true }).click();
    await expect(this.wrapper).toBeHidden();
  }

  // Use the explicit Close Card button — Escape only exits inline-edit mode, not the modal.
  async close() {
    await this.page.getByRole('button', { name: 'Close Card' }).click();
    await expect(this.wrapper).toBeHidden();
  }
}
