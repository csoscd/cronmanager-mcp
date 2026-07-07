// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const agentId = z.number().int().positive().optional()
  .describe('Target a specific agent (multi-agent setup). Omit to use the default agent.');

export function registerAuditTools(server: McpServer): void {
  server.tool(
    'get_audit_log',
    'Return a paginated list of audit log entries with optional filters. Requires audit:read scope (admin-only). Available on CronManager ≥ 4.3.4.',
    {
      limit: z.number().int().min(1).max(500).optional()
        .describe('Max entries per page (default 100, max 500)'),
      offset: z.number().int().min(0).optional()
        .describe('Pagination offset (default 0)'),
      username: z.string().optional()
        .describe('Filter by exact username'),
      action_prefix: z.string().optional()
        .describe('Filter by action prefix, e.g. "cron" matches cron.create, cron.update, cron.delete, …'),
      date_from: z.string().optional()
        .describe('Lower bound on created_at (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'),
      date_to: z.string().optional()
        .describe('Upper bound on created_at (YYYY-MM-DD or YYYY-MM-DD HH:MM:SS)'),
      agent_id: agentId,
    },
    async ({ agent_id, ...params }) => {
      try {
        return ok(await apiClient.get('/audit', params, agent_id));
      } catch (e) { return fail(e); }
    }
  );
}
