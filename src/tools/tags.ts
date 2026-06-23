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
}
