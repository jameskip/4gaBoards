import { expect, Locator, Page } from '@playwright/test';

import { dragCardToList } from '../helpers/dnd';

export class BoardPage {
  constructor(readonly page: Page) {}

  async goto(boardId: string) {
    await this.page.goto(`/boards/${boardId}`);
    // Web-first auto-waits for the board shell to render — no need for networkidle, which
    // is fragile on SPAs with WebSockets (eslint-plugin-playwright `no-networkidle`).
    await expect(this.page.locator('[class*="Board_boardContainer"]')).toBeVisible();
  }

  // Partial class matching (`[class*="..."]`) survives CSS-modules hashes; the app has zero
  // data-testid attributes so semantic locators + class-prefix matching is the stable strategy.
  list(name: string): Locator {
    return this.page.locator('[class*="List_outerWrapper"]').filter({ hasText: name });
  }

  // Returns the rbd-Draggable wrapper (DnD-ready). Use `cardInList` when you need to scope
  // to a specific list; use `openCard` to click the inner Card_name (avoids the rbd handler).
  card(title: string): Locator {
    return this.page
      .locator('[class*="Card_wrapper"]')
      .filter({ has: this.page.locator(`[class*="Card_name"][title="${title}"]`) });
  }

  cardInList(listName: string, title: string): Locator {
    return this.list(listName).locator(`[class*="Card_name"][title="${title}"]`);
  }

  cardNamesIn(listName: string): Locator {
    return this.list(listName).locator('[class*="Card_name"]');
  }

  async addCard(listName: string, title: string) {
    const list = this.list(listName);
    await list.getByRole('button', { name: 'Add card' }).first().click();
    await list.locator('textarea[name="name"]').fill(title);
    await list.getByRole('button', { name: 'Add card' }).last().click();
    await expect(this.card(title)).toBeVisible();
  }

  // Click the inner Card_name, not Card_wrapper — clicking the wrapper routes to rbd's drag handler.
  async openCard(title: string) {
    await this.card(title).locator('[class*="Card_name"]').click();
    await expect(this.page.locator('[class*="CardModal_wrapper"]')).toBeVisible();
  }

  async moveCard(title: string, toList: string) {
    await dragCardToList(this.page, this.card(title), this.list(toList));
  }
}
