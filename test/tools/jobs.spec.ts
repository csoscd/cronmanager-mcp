import { describe, it, expect, vi, beforeEach } from 'vitest';

// env vars set via test/setup.ts before any module loads

// vi.mock is hoisted — define error classes inline to avoid reference-before-init
vi.mock('../../src/apiClient.js', () => {
  class ApiHttpError extends Error {
    constructor(public readonly status: number, public readonly body: unknown) {
      super(`HTTP ${status}`);
      this.name = 'ApiHttpError';
    }
  }
  class ApiUnreachableError extends Error {
    constructor(cause: string) { super(`API unreachable: ${cause}`); this.name = 'ApiUnreachableError'; }
  }
  return {
    apiClient: {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      getText: vi.fn(),
    },
    ApiHttpError,
    ApiUnreachableError,
  };
});

describe('job tools', () => {
  let apiMock: Record<string, ReturnType<typeof vi.fn>>;
  let server: { tool: ReturnType<typeof vi.fn> };
  let handlers: Map<string, (...args: unknown[]) => Promise<unknown>>;

  beforeEach(async () => {
    const { apiClient } = await import('../../src/apiClient.js');
    apiMock = apiClient as unknown as Record<string, ReturnType<typeof vi.fn>>;

    handlers = new Map();
    server = {
      tool: vi.fn((_name: string, _desc: string, _schema: unknown, handler: (...args: unknown[]) => Promise<unknown>) => {
        handlers.set(_name, handler);
      }),
    };

    const { registerJobTools } = await import('../../src/tools/jobs.js');
    registerJobTools(server as never, false);
  });

  describe('list_jobs', () => {
    it('calls GET /jobs and returns data', async () => {
      const mockData = { data: [{ id: 1, command: '/backup.sh' }], count: 1 };
      (apiMock['get'] as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

      const handler = handlers.get('list_jobs')!;
      const result = await handler({ tag: 'backup', limit: 10 }) as { content: [{ text: string }] };

      expect(apiMock['get']).toHaveBeenCalledWith('/jobs', expect.objectContaining({ tag: 'backup', limit: 10 }));
      expect(result.content[0]?.text).toContain('/backup.sh');
      expect(result).not.toHaveProperty('isError');
    });

    it('returns isError on 403 API error', async () => {
      const { ApiHttpError } = await import('../../src/apiClient.js');
      (apiMock['get'] as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiHttpError(403, { error: 'Forbidden', message: 'Insufficient scope' })
      );

      const handler = handlers.get('list_jobs')!;
      const result = await handler({}) as { isError: boolean; content: [{ text: string }] };

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('403');
      expect(result.content[0]?.text).toContain('Forbidden');
    });
  });

  describe('get_job', () => {
    it('calls GET /jobs/{id} and returns job', async () => {
      const job = { id: 42, command: '/deploy.sh' };
      (apiMock['get'] as ReturnType<typeof vi.fn>).mockResolvedValue(job);

      const handler = handlers.get('get_job')!;
      const result = await handler({ id: 42 }) as { content: [{ text: string }] };

      expect(apiMock['get']).toHaveBeenCalledWith('/jobs/42');
      expect(result.content[0]?.text).toContain('/deploy.sh');
    });
  });

  describe('create_job', () => {
    it('calls POST /jobs with body', async () => {
      const created = { id: 1, command: '/backup.sh' };
      (apiMock['post'] as ReturnType<typeof vi.fn>).mockResolvedValue(created);

      const handler = handlers.get('create_job')!;
      const payload = { linux_user: 'deploy', schedule: '0 3 * * *', command: '/backup.sh', targets: ['local'] };
      await handler(payload);

      expect(apiMock['post']).toHaveBeenCalledWith('/jobs', expect.objectContaining(payload));
    });
  });

  describe('update_job', () => {
    it('calls PUT /jobs/{id} without the id in body', async () => {
      (apiMock['put'] as ReturnType<typeof vi.fn>).mockResolvedValue({ id: 5, active: false });

      const handler = handlers.get('update_job')!;
      await handler({ id: 5, active: false });

      expect(apiMock['put']).toHaveBeenCalledWith('/jobs/5', expect.not.objectContaining({ id: 5 }));
      expect(apiMock['put']).toHaveBeenCalledWith('/jobs/5', expect.objectContaining({ active: false }));
    });
  });

  describe('delete_job', () => {
    it('calls DELETE /jobs/{id}', async () => {
      (apiMock['delete'] as ReturnType<typeof vi.fn>).mockResolvedValue({ success: true });

      const handler = handlers.get('delete_job')!;
      await handler({ id: 5, confirm: true });

      expect(apiMock['delete']).toHaveBeenCalledWith('/jobs/5');
    });
  });

  describe('readonly mode', () => {
    it('does not register write tools when readOnly=true', async () => {
      const readOnlyHandlers = new Map<string, unknown>();
      const readOnlyServer = {
        tool: vi.fn((name: string) => readOnlyHandlers.set(name, true)),
      };
      const { registerJobTools } = await import('../../src/tools/jobs.js');
      registerJobTools(readOnlyServer as never, true);

      expect(readOnlyHandlers.has('list_jobs')).toBe(true);
      expect(readOnlyHandlers.has('get_job')).toBe(true);
      expect(readOnlyHandlers.has('create_job')).toBe(false);
      expect(readOnlyHandlers.has('update_job')).toBe(false);
      expect(readOnlyHandlers.has('delete_job')).toBe(false);
    });
  });
});
