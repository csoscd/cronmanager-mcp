// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const SECTIONS = ['mail', 'telegram', 'influxdb', 'notifications'] as const;

const agentId = z.number().int().positive().optional()
  .describe('Target a specific agent (multi-agent setup). Omit to use the default agent.');

export function registerSettingsTools(server: McpServer, readOnly: boolean): void {
  server.tool(
    'get_settings',
    'Read all agent settings (mail, Telegram, InfluxDB, notifications). Requires settings:read scope.',
    { agent_id: agentId },
    async ({ agent_id }) => {
      try {
        return ok(await apiClient.get('/settings', undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_settings_section',
    'Read a single settings section. Requires settings:read scope.',
    {
      section: z.enum(SECTIONS).describe('Settings section name'),
      agent_id: agentId,
    },
    async ({ section, agent_id }) => {
      try {
        return ok(await apiClient.get(`/settings/${section}`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  if (readOnly) return;

  server.tool(
    'update_settings_section',
    'Update a settings section. Only provided keys are changed. Requires settings:write scope.',
    {
      section: z.enum(SECTIONS).describe('Settings section to update'),
      data: z.record(z.unknown()).describe('Key-value pairs to update within the section'),
      agent_id: agentId,
    },
    async ({ section, data, agent_id }) => {
      try {
        return ok(await apiClient.put(`/settings/${section}`, data, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'resync_crontab',
    'Resync the crontab from the database. Use after manual database changes. Requires settings:write scope.',
    {
      confirm: z.literal(true).describe('Must be true to confirm resync'),
      agent_id: agentId,
    },
    async ({ agent_id }) => {
      try {
        return ok(await apiClient.post('/settings/resync', undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );
}
