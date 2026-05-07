import { expect, test } from '../fixtures';
import { dragCardKeyboard } from '../helpers/dnd';

test.describe('card lifecycle', () => {
  test('create a new card in a list', async ({ pages: { boardPage, page }, seedBoard }) => {
    await test.step('seed an empty board', async () => {
      const { boardId } = await seedBoard();
      await boardPage.goto(boardId);
    });

    await test.step('add a card to the To Do list', async () => {
      await boardPage.addCard('To Do', 'Buy milk');
    });

    await test.step('card persists after reload', async () => {
      await page.reload();
      await expect(boardPage.card('Buy milk')).toBeVisible();
    });
  });

  test('edit a card title via the modal', async ({ api, pages: { boardPage, cardModal }, seedBoard }) => {
    await test.step('seed a board with one card', async () => {
      const { boardId, listIds } = await seedBoard();
      await api.createCard(listIds[0], 'Original', 65535);
      await boardPage.goto(boardId);
    });

    await test.step('rename the card via the modal', async () => {
      await boardPage.openCard('Original');
      await cardModal.setTitle('Renamed');
      await cardModal.close();
    });

    await test.step('renamed card replaces the original on the board', async () => {
      await expect(boardPage.card('Renamed')).toBeVisible();
      await expect(boardPage.card('Original')).toHaveCount(0);
    });
  });

  test('move a card between lists via DnD', async ({ api, pages: { boardPage, page }, seedBoard }) => {
    await test.step('seed a two-list board with one card in To Do', async () => {
      const { boardId, listIds } = await seedBoard(['To Do', 'In Progress']);
      await api.createCard(listIds[0], 'Task A', 65535);
      await boardPage.goto(boardId);
    });

    await test.step('drag the card from To Do to In Progress', async () => {
      await boardPage.moveCard('Task A', 'In Progress');
    });

    await test.step('card lives only in the target list', async () => {
      await expect(boardPage.cardInList('In Progress', 'Task A')).toBeVisible();
      await expect(boardPage.cardInList('To Do', 'Task A')).toHaveCount(0);
    });

    await test.step('move persists after reload', async () => {
      await page.reload();
      await expect(boardPage.cardInList('In Progress', 'Task A')).toBeVisible();
    });
  });

  test('reorder a card within the same list via keyboard DnD', async ({ api, pages: { boardPage, page }, seedBoard }) => {
    await test.step('seed a list with three ordered cards', async () => {
      const { boardId, listIds } = await seedBoard(['Backlog']);
      for (const [i, name] of ['A', 'B', 'C'].entries()) {
        await api.createCard(listIds[0], name, (i + 1) * 65535);
      }
      await boardPage.goto(boardId);
    });

    await test.step('move A two slots down via keyboard DnD', async () => {
      await dragCardKeyboard(page, boardPage.card('A'), 'ArrowDown', 2);
    });

    await test.step('order is now B, C, A', async () => {
      const cardNames = boardPage.cardNamesIn('Backlog');
      await expect(cardNames.nth(0)).toHaveAttribute('title', 'B');
      await expect(cardNames.nth(1)).toHaveAttribute('title', 'C');
      await expect(cardNames.nth(2)).toHaveAttribute('title', 'A');
    });
  });

  test('delete a card from the modal', async ({ api, pages: { boardPage, cardModal, page }, seedBoard }) => {
    await test.step('seed a board with one card', async () => {
      const { boardId, listIds } = await seedBoard();
      await api.createCard(listIds[0], 'Doomed', 65535);
      await boardPage.goto(boardId);
    });

    await test.step('delete the card via the modal', async () => {
      await boardPage.openCard('Doomed');
      await cardModal.delete();
    });

    await test.step('card is gone and stays gone after reload', async () => {
      await expect(boardPage.card('Doomed')).toHaveCount(0);
      await page.reload();
      await expect(boardPage.card('Doomed')).toHaveCount(0);
    });
  });
});
