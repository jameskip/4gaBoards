import { type FullConfig, request } from '@playwright/test';

type TokenResponse = { item: string };
type ProjectsResponse = { items?: { id: string; name?: string }[] };

// Runs once before any test. API-deletes leftover `E2E*` projects from prior crashed/aborted runs
// — keeps the dashboard small so post-login renders fast under heavy concurrency.
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0]?.use.baseURL ?? process.env.BASE_URL ?? 'http://localhost:3000';
  const ctx = await request.newContext({ baseURL });

  const loginRes = await ctx.post('/api/access-tokens', {
    form: { emailOrUsername: 'demo', password: 'demo' },
  });
  if (!loginRes.ok()) return ctx.dispose();
  const { item: token } = (await loginRes.json()) as TokenResponse;
  const headers = { Authorization: `Bearer ${token}` };

  const projectsRes = await ctx.get('/api/projects', { headers });
  if (!projectsRes.ok()) return ctx.dispose();
  const { items = [] } = (await projectsRes.json()) as ProjectsResponse;

  const stale = items.filter((p) => p.name?.startsWith('E2E'));
  await Promise.all(
    stale.map((p) => ctx.delete(`/api/projects/${p.id}`, { headers }).catch(() => undefined)),
  );

  await ctx.dispose();
}
