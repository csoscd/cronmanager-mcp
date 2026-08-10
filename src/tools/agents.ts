// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

export function registerAgentTools(server: McpServer): void {
  server.tool(
    'list_agents',
    'List all Cronmanager agents visible to this API key. Each agent includes id, name, description, enabled, and web_url (public URL of the web container, same for all agents, null if not configured). Requires settings:read scope.',
    {},
    async () => {
      try {
        return ok(await apiClient.get('/agents'));
      } catch (e) { return fail(e); }
    }
  );
}
