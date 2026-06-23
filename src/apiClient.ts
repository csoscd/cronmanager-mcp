// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { config } from './config.js';
import { logger } from './logger.js';

if (config.CM_INSECURE_TLS) {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = '0';
  logger.warn('CM_INSECURE_TLS=true: TLS certificate verification disabled');
}

export class ApiHttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`HTTP ${status}`);
    this.name = 'ApiHttpError';
  }
}

export class ApiUnreachableError extends Error {
  constructor(cause: string) {
    super(`API unreachable: ${cause}`);
    this.name = 'ApiUnreachableError';
  }
}

type QueryValue = string | number | boolean | undefined;

interface RequestOptions {
  query?: Record<string, QueryValue>;
  body?: unknown;
  text?: boolean;
  agentId?: number;
}

async function request(method: string, path: string, opts?: RequestOptions): Promise<unknown> {
  const url = new URL(`${config.CM_BASE_URL}/api/v1${path}`);

  if (opts?.query) {
    for (const [key, value] of Object.entries(opts.query)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.TIMEOUT_MS);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${config.CM_API_KEY}`,
    Accept: 'application/json',
  };

  let bodyString: string | undefined;
  if (opts?.body !== undefined) {
    bodyString = JSON.stringify(opts.body);
    headers['Content-Type'] = 'application/json';
  }

  const effectiveAgentId = opts?.agentId !== undefined ? String(opts.agentId) : config.CM_AGENT_ID;
  if (effectiveAgentId) headers['X-Agent-Id'] = effectiveAgentId;

  logger.debug('API request', { method, path });

  try {
    const res = await fetch(url.toString(), {
      method,
      headers,
      body: bodyString,
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      let errorBody: unknown = { error: res.statusText };
      try { errorBody = await res.json(); } catch { /* keep default */ }
      throw new ApiHttpError(res.status, errorBody);
    }

    if (opts?.text) return res.text();

    const text = await res.text();
    if (!text) return undefined;
    return JSON.parse(text);
  } catch (e) {
    clearTimeout(timer);
    if (e instanceof ApiHttpError) throw e;
    if (e instanceof Error && e.name === 'AbortError') {
      throw new ApiUnreachableError('request timed out');
    }
    throw new ApiUnreachableError(String(e));
  }
}

export const apiClient = {
  get: <T>(path: string, query?: Record<string, QueryValue>, agentId?: number): Promise<T> =>
    request('GET', path, { query, agentId }) as Promise<T>,

  getText: (path: string, query?: Record<string, QueryValue>, agentId?: number): Promise<string> =>
    request('GET', path, { query, text: true, agentId }) as Promise<string>,

  post: <T>(path: string, body?: unknown, agentId?: number): Promise<T> =>
    request('POST', path, { body, agentId }) as Promise<T>,

  put: <T>(path: string, body?: unknown, agentId?: number): Promise<T> =>
    request('PUT', path, { body, agentId }) as Promise<T>,

  delete: <T>(path: string, agentId?: number): Promise<T> =>
    request('DELETE', path, { agentId }) as Promise<T>,
};
