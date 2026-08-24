// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const agentId = z.number().int().positive().optional()
  .describe('Target a specific agent (multi-agent setup). Omit to use the default agent.');

export function registerTagTools(server: McpServer): void {
  server.tool(
    'list_tags',
    'List all tags.',
    { agent_id: agentId },
    async ({ agent_id }) => {
      try {
        return ok(await apiClient.get('/tags', undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'list_linux_users',
    'List all Linux users available for cron job scheduling on the selected agent. Returns a docker_mode flag (true = only root is valid inside the container). Requires jobs:read scope. Available on CronManager ≥ 4.8.0.',
    { agent_id: agentId },
    async ({ agent_id }) => {
      try {
        return ok(await apiClient.get('/linux-users', undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'list_targets',
    'List all distinct execution targets configured across cron jobs, with the count of jobs using each target. Requires jobs:read scope. Available on CronManager ≥ 4.8.0.',
    {
      active: z.boolean().optional().describe('true = only targets of active jobs, false = inactive only; omit for all'),
      agent_id: agentId,
    },
    async ({ active, agent_id }) => {
      try {
        return ok(await apiClient.get('/targets', { active }, agent_id));
      } catch (e) { return fail(e); }
    }
  );
}
