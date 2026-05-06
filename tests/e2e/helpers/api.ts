import { APIRequestContext, request } from '@playwright/test';

export type Seeded = { projectId: string; boardId: string; listIds: string[] };

// Sails wraps every successful POST in `{ item: ... }`.
type ItemResponse<T> = { item: T };
type EntityResponse = ItemResponse<{ id: string }>;
type TokenResponse = ItemResponse<string>;

export class Api {
  private constructor(private ctx: APIRequestContext, private token: string) {}

  static async login(baseURL: string, user = 'demo', pass = 'demo'): Promise<Api> {
    const ctx = await request.newContext({ baseURL });
    const res = await ctx.post('/api/access-tokens', { form: { emailOrUsername: user, password: pass } });
    if (!res.ok()) throw new Error(`API login failed: ${res.status()} ${await res.text()}`);
    const { item: token } = (await res.json()) as TokenResponse;
    return new Api(ctx, token);
  }

  private headers() {
    return { Authorization: `Bearer ${this.token}` };
  }

  async createProject(name: string): Promise<string> {
    const res = await this.ctx.post('/api/projects', { headers: this.headers(), data: { name } });
    const body = (await res.json()) as Partial<EntityResponse>;
    if (!body.item?.id) throw new Error(`createProject failed: ${JSON.stringify(body)}`);
    return body.item.id;
  }

  async createBoard(projectId: string, name: string): Promise<string> {
    // `isGithubConnected: false` is required by Sails validators even though we don't use GitHub —
    // omitting it returns E_MISSING_OR_INVALID_PARAMS.
    const res = await this.ctx.post(`/api/projects/${projectId}/boards`, {
      headers: this.headers(),
      data: { name, position: 1, isGithubConnected: false },
    });
    const body = (await res.json()) as Partial<EntityResponse>;
    if (!body.item?.id) throw new Error(`createBoard failed: ${JSON.stringify(body)}`);
    return body.item.id;
  }

  async createList(boardId: string, name: string, position: number): Promise<string> {
    // `isCollapsed: false` is similarly required by the server even for newly-created lists.
    const res = await this.ctx.post(`/api/boards/${boardId}/lists`, {
      headers: this.headers(),
      data: { name, position, isCollapsed: false },
    });
    const body = (await res.json()) as Partial<EntityResponse>;
    if (!body.item?.id) throw new Error(`createList failed: ${JSON.stringify(body)}`);
    return body.item.id;
  }

  async createCard(listId: string, name: string, position: number): Promise<string> {
    const res = await this.ctx.post(`/api/lists/${listId}/cards`, {
      headers: this.headers(),
      data: { name, position },
    });
    const body = (await res.json()) as Partial<EntityResponse>;
    if (!body.item?.id) throw new Error(`createCard failed: ${JSON.stringify(body)}`);
    return body.item.id;
  }

  async deleteProject(projectId: string) {
    await this.ctx.delete(`/api/projects/${projectId}`, { headers: this.headers() });
  }

  async seedBoard(boardName: string, listNames: string[]): Promise<Seeded> {
    const projectId = await this.createProject(`E2E ${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
    const boardId = await this.createBoard(projectId, boardName);
    const listIds = await Promise.all(listNames.map((n, i) => this.createList(boardId, n, (i + 1) * 65535)));
    return { projectId, boardId, listIds };
  }

  async dispose() {
    await this.ctx.dispose();
  }
}
