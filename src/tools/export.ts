// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { okText, fail } from '../toolHelpers.js';

export function registerExportTools(server: McpServer): void {
  server.tool(
    'export_jobs',
    'Export all cron jobs. Use format "json" for structured data, "csv" for spreadsheets, "cron" for raw crontab text.',
    {
      format: z.enum(['json', 'csv', 'cron']).default('json').describe('Export format (default: json)'),
      user: z.string().optional().describe('Filter by Linux user'),
      tag: z.string().optional().describe('Filter by tag'),
    },
    async ({ format, user, tag }) => {
      try {
        const text = await apiClient.getText('/export', { format, user, tag });
        return okText(text);
      } catch (e) { return fail(e); }
    }
  );
}
