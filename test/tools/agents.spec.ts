import { describe, it, expect, vi, beforeEach } from 'vitest';

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

describe('agent tools', () => {
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

    const { registerAgentTools } = await import('../../src/tools/agents.js');
    registerAgentTools(server as never);
  });

  describe('list_agents', () => {
    it('calls GET /agents and returns data', async () => {
      const mockData = { data: [{ id: 1, name: 'Default', description: '', enabled: true }], count: 1 };
      (apiMock['get'] as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

      const handler = handlers.get('list_agents')!;
      const result = await handler({}) as { content: [{ text: string }] };

      expect(apiMock['get']).toHaveBeenCalledWith('/agents');
      expect(result.content[0]?.text).toContain('Default');
      expect(result).not.toHaveProperty('isError');
    });

    it('returns isError on 403 (missing settings:read scope)', async () => {
      const { ApiHttpError } = await import('../../src/apiClient.js');
      (apiMock['get'] as ReturnType<typeof vi.fn>).mockRejectedValue(
        new ApiHttpError(403, { error: 'Forbidden', message: 'Insufficient scope' })
      );

      const handler = handlers.get('list_agents')!;
      const result = await handler({}) as { isError: boolean; content: [{ text: string }] };

      expect(result.isError).toBe(true);
      expect(result.content[0]?.text).toContain('403');
    });
  });
});
