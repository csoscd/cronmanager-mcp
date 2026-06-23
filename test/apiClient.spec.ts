import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// env vars set via test/setup.ts before any module loads

describe('apiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function getClient() {
    vi.resetModules();
    const mod = await import('../src/apiClient.js');
    return mod;
  }

  it('sends correct Authorization header', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [] })),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs');

    expect(fetchMock).toHaveBeenCalledOnce();
    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer cm_testkey123');
  });

  it('sends X-Agent-Id header when CM_AGENT_ID is set', async () => {
    process.env['CM_AGENT_ID'] = '2';
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs');

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['X-Agent-Id']).toBe('2');
    delete process.env['CM_AGENT_ID'];
  });

  it('appends query parameters to URL', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [] })),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs', { tag: 'backup', limit: 10 });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toContain('tag=backup');
    expect(url).toContain('limit=10');
  });

  it('skips undefined query parameters', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [] })),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs', { tag: undefined, user: 'deploy' });

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).not.toContain('tag=');
    expect(url).toContain('user=deploy');
  });

  it('throws ApiHttpError on 4xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not Found', message: 'Job 99 does not exist.' }),
    });

    const { apiClient, ApiHttpError } = await getClient();
    await expect(apiClient.get('/jobs/99')).rejects.toThrow(ApiHttpError);
  });

  it('includes status and body in ApiHttpError', async () => {
    const errorBody = { error: 'Not Found', message: 'Job 99 does not exist.', code: 404 };
    fetchMock.mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve(errorBody),
    });

    const { apiClient, ApiHttpError } = await getClient();
    try {
      await apiClient.get('/jobs/99');
      expect.fail('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(ApiHttpError);
      const err = e as InstanceType<typeof ApiHttpError>;
      expect(err.status).toBe(404);
      expect(err.body).toEqual(errorBody);
    }
  });

  it('throws ApiHttpError on 403 scope error', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      json: () => Promise.resolve({ error: 'Forbidden', message: 'Insufficient scope' }),
    });

    const { apiClient, ApiHttpError } = await getClient();
    await expect(apiClient.post('/jobs', {})).rejects.toThrow(ApiHttpError);
  });

  it('throws ApiUnreachableError on network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'));

    const { apiClient, ApiUnreachableError } = await getClient();
    await expect(apiClient.get('/jobs')).rejects.toThrow(ApiUnreachableError);
  });

  it('throws ApiUnreachableError on timeout (AbortError)', async () => {
    fetchMock.mockRejectedValue(Object.assign(new Error('aborted'), { name: 'AbortError' }));

    const { apiClient, ApiUnreachableError } = await getClient();
    await expect(apiClient.get('/jobs')).rejects.toThrow(ApiUnreachableError);
    await expect(apiClient.get('/jobs')).rejects.toThrow('timed out');
  });

  it('sends JSON body for POST requests', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ id: 1 })),
    });

    const { apiClient } = await getClient();
    const payload = { linux_user: 'deploy', schedule: '0 3 * * *', command: '/backup.sh', targets: ['local'] };
    await apiClient.post('/jobs', payload);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(options.body).toBe(JSON.stringify(payload));
  });

  it('returns raw text for getText()', async () => {
    const csvText = 'id,command\n1,/backup.sh';
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(csvText),
    });

    const { apiClient } = await getClient();
    const result = await apiClient.getText('/export', { format: 'csv' });
    expect(result).toBe(csvText);
  });

  it('constructs URL with base URL and /api/v1 prefix', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs');

    const [url] = fetchMock.mock.calls[0] as [string];
    expect(url).toMatch(/^https:\/\/cronmanager\.example\.com\/api\/v1\/jobs/);
  });

  it('sets X-Agent-Id header from agentId parameter', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs', undefined, 3);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['X-Agent-Id']).toBe('3');
  });

  it('agentId parameter overrides global CM_AGENT_ID', async () => {
    process.env['CM_AGENT_ID'] = '1';
    fetchMock.mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    const { apiClient } = await getClient();
    await apiClient.get('/jobs', undefined, 5);

    const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers['X-Agent-Id']).toBe('5');
    delete process.env['CM_AGENT_ID'];
  });
});
