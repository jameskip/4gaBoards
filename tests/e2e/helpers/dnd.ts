import { Locator, Page } from '@playwright/test';

/**
 * Drag a card to a target list. rbd ignores single-mousemove drags, so we feed it
 * the intermediate moves it needs via `mouse.move(..., { steps })` — the "precise
 * control" path from https://playwright.dev/docs/input#drag-and-drop. The same
 * effect is reachable with `card.dragTo(targetList, { steps })`; we keep the
 * manual form to make the hover-before-mousedown ordering explicit.
 */
export async function dragCardToList(page: Page, card: Locator, targetList: Locator, steps = 20) {
  const target = await boundsCenter(targetList);
  await card.hover();
  await page.mouse.down();
  await page.mouse.move(target.x, target.y, { steps });
  await page.mouse.up();
}

/** Keyboard-driven DnD using rbd's built-in a11y. Fallback if mouse path flakes. */
export async function dragCardKeyboard(page: Page, card: Locator, key: 'ArrowDown' | 'ArrowUp' | 'ArrowLeft' | 'ArrowRight', repeats = 1) {
  await card.focus();
  await page.keyboard.press('Space');
  for (let i = 0; i < repeats; i++) await page.keyboard.press(key);
  await page.keyboard.press('Space');
}

async function boundsCenter(locator: Locator) {
  const box = await locator.boundingBox();
  if (!box) throw new Error('Element has no bounding box');
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}
