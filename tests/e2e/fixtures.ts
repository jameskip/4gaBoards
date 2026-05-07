import { test as base, type Page } from '@playwright/test';

import { Api, Seeded } from './helpers/api';
import { BoardPage } from './pages/BoardPage';
import { CardModal } from './pages/CardModal';
import { HeaderPage } from './pages/HeaderPage';
import { LoginPage } from './pages/LoginPage';

type Pages = {
  page: Page;
  loginPage: LoginPage;
  boardPage: BoardPage;
  cardModal: CardModal;
  header: HeaderPage;
};

type TestFixtures = {
  pages: Pages;
  seedBoard: (lists?: string[]) => Promise<Seeded>;
};

type WorkerFixtures = {
  api: Api;
};

export const test = base.extend<TestFixtures, WorkerFixtures>({
  // Single `pages` fixture (Mozilla FxA convention) — all POMs in one place; specs destructure once.
  pages: async ({ page }, use) => {
    await use({
      page,
      loginPage: new LoginPage(page),
      boardPage: new BoardPage(page),
      cardModal: new CardModal(page),
      header: new HeaderPage(page),
    });
  },

  // Worker-scoped: one API login per worker, reused across that worker's tests.
  // Avoids re-logging in per test (server has a 5-failure rate limit).
  api: [
    async ({}, use) => {
      const api = await Api.login(process.env.BASE_URL ?? 'http://localhost:3000');
      await use(api);
      await api.dispose();
    },
    { scope: 'worker' },
  ],

  // Each test that calls seedBoard gets its own project; teardown deletes it. Per-test
  // isolation prevents cross-test interference and keeps the dashboard small.
  seedBoard: async ({ api }, use) => {
    const created: string[] = [];
    const seed = async (lists = ['To Do', 'In Progress', 'Done']) => {
      const s = await api.seedBoard('E2E Board', lists);
      created.push(s.projectId);
      return s;
    };
    await use(seed);
    await Promise.all(created.map((id) => api.deleteProject(id).catch(() => {})));
  },
});

export { expect } from '@playwright/test';
