import { expect, test } from '../fixtures';
import { dragCardKeyboard } from '../helpers/dnd';

test.describe('card lifecycle', () => {
  test('create a new card in a list', async ({ pages: { boardPage, page }, seedBoard }) => {
    const { boardId } = await seedBoard();
    await boardPage.goto(boardId);

    await boardPage.addCard('To Do', 'Buy milk');
    await page.reload();
    await expect(boardPage.card('Buy milk')).toBeVisible();
  });

  test('edit a card title via the modal', async ({ api, pages: { boardPage, cardModal }, seedBoard }) => {
    const { boardId, listIds } = await seedBoard();
    await api.createCard(listIds[0], 'Original', 65535);
    await boardPage.goto(boardId);

    await boardPage.openCard('Original');
    await cardModal.setTitle('Renamed');
    await cardModal.close();

    await expect(boardPage.card('Renamed')).toBeVisible();
    await expect(boardPage.card('Original')).toHaveCount(0);
  });

  test('move a card between lists via DnD', async ({ api, pages: { boardPage, page }, seedBoard }) => {
    const { boardId, listIds } = await seedBoard(['To Do', 'In Progress']);
    await api.createCard(listIds[0], 'Task A', 65535);
    await boardPage.goto(boardId);

    await boardPage.moveCard('Task A', 'In Progress');

    // Assert the card is in the target list AND absent from the source — guards against
    // a "ghost copy" bug where rbd renders the new position but doesn't remove the original.
    await expect(boardPage.cardInList('In Progress', 'Task A')).toBeVisible();
    await expect(boardPage.cardInList('To Do', 'Task A')).toHaveCount(0);
    // Reload to verify the move persisted server-side, not just in client state.
    await page.reload();
    await expect(boardPage.cardInList('In Progress', 'Task A')).toBeVisible();
  });

  test('reorder a card within the same list via keyboard DnD', async ({ api, pages: { boardPage, page }, seedBoard }) => {
    const { boardId, listIds } = await seedBoard(['Backlog']);
    for (const [i, name] of ['A', 'B', 'C'].entries()) {
      await api.createCard(listIds[0], name, (i + 1) * 65535);
    }
    await boardPage.goto(boardId);

    await dragCardKeyboard(page, boardPage.card('A'), 'ArrowDown', 2);

    const cardNames = boardPage.cardNamesIn('Backlog');
    await expect(cardNames.nth(0)).toHaveAttribute('title', 'B');
    await expect(cardNames.nth(1)).toHaveAttribute('title', 'C');
    await expect(cardNames.nth(2)).toHaveAttribute('title', 'A');
  });

  test('delete a card from the modal', async ({ api, pages: { boardPage, cardModal, page }, seedBoard }) => {
    const { boardId, listIds } = await seedBoard();
    await api.createCard(listIds[0], 'Doomed', 65535);
    await boardPage.goto(boardId);

    await boardPage.openCard('Doomed');
    await cardModal.delete();

    await expect(boardPage.card('Doomed')).toHaveCount(0);
    await page.reload();
    await expect(boardPage.card('Doomed')).toHaveCount(0);
  });
});
