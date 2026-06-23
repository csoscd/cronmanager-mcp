// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

export function registerTagTools(server: McpServer): void {
  server.tool(
    'list_tags',
    'List all tags.',
    {},
    async () => {
      try {
        return ok(await apiClient.get('/tags'));
      } catch (e) { return fail(e); }
    }
  );
}
