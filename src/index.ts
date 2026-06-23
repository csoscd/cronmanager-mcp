// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { config, APP_VERSION } from './config.js';
import { logger } from './logger.js';
import { apiClient, ApiHttpError, ApiUnreachableError } from './apiClient.js';
import { registerAllTools } from './tools/index.js';

function createMcpServer(): McpServer {
  const server = new McpServer({ name: 'cronmanager-mcp', version: APP_VERSION });
  registerAllTools(server, config.MCP_READONLY_MODE);
  return server;
}

async function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    req.on('error', reject);
  });
}

async function parsedBody(req: IncomingMessage): Promise<unknown> {
  if (req.method !== 'POST') return undefined;
  const raw = await readBody(req);
  return raw ? JSON.parse(raw) : undefined;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  const json = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(json);
}

function checkBearer(req: IncomingMessage): boolean {
  const auth = req.headers['authorization'];
  return auth === `Bearer ${config.MCP_AUTH_TOKEN}`;
}

const sessions = new Map<string, { transport: StreamableHTTPServerTransport; server: McpServer }>();

async function handleMcp(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const sessionId = req.headers['mcp-session-id'];
  const sid = Array.isArray(sessionId) ? sessionId[0] : sessionId;
  const existing = sid ? sessions.get(sid) : undefined;

  if (existing) {
    await existing.transport.handleRequest(req, res, await parsedBody(req));
    return;
  }

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });
  const server = createMcpServer();
  await server.connect(transport);

  const newSid = transport.sessionId;
  if (newSid) {
    sessions.set(newSid, { transport, server });
    transport.onclose = () => { sessions.delete(newSid); };
  }

  await transport.handleRequest(req, res, await parsedBody(req));
}

async function handleReadyz(res: ServerResponse): Promise<void> {
  try {
    await apiClient.get('/tags');
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
  } catch (e) {
    let message = 'Cronmanager API unreachable';
    if (e instanceof ApiHttpError) message = `Cronmanager API error: HTTP ${e.status}`;
    else if (e instanceof ApiUnreachableError) message = e.message;
    res.writeHead(503, { 'Content-Type': 'text/plain' });
    res.end(message);
  }
}

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = req.url ?? '/';

  if (url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('ok');
    return;
  }

  if (url === '/readyz') {
    await handleReadyz(res);
    return;
  }

  if (!checkBearer(req)) {
    sendJson(res, 401, { error: 'Unauthorized', message: 'Missing or invalid Bearer token' });
    return;
  }

  if (url === '/mcp' || url.startsWith('/mcp?') || url.startsWith('/mcp/')) {
    try {
      await handleMcp(req, res);
    } catch (e) {
      logger.error('MCP handler error', { error: String(e) });
      if (!res.headersSent) sendJson(res, 500, { error: 'Internal server error' });
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

httpServer.listen(config.PORT, () => {
  logger.info('cronmanager-mcp started', {
    version: APP_VERSION,
    port: config.PORT,
    readOnly: config.MCP_READONLY_MODE,
  });
});

process.on('SIGTERM', () => {
  logger.info('Shutting down');
  httpServer.close(() => process.exit(0));
});

process.on('SIGINT', () => {
  logger.info('Shutting down');
  httpServer.close(() => process.exit(0));
});
