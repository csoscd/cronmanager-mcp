// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const SECTIONS = ['mail', 'telegram', 'influxdb', 'notifications'] as const;

export function registerSettingsTools(server: McpServer, readOnly: boolean): void {
  server.tool(
    'get_settings',
    'Read all agent settings (mail, Telegram, InfluxDB, notifications). Requires settings:read scope.',
    {},
    async () => {
      try {
        return ok(await apiClient.get('/settings'));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_settings_section',
    'Read a single settings section. Requires settings:read scope.',
    { section: z.enum(SECTIONS).describe('Settings section name') },
    async ({ section }) => {
      try {
        return ok(await apiClient.get(`/settings/${section}`));
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
    },
    async ({ section, data }) => {
      try {
        return ok(await apiClient.put(`/settings/${section}`, data));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'resync_crontab',
    'Resync the crontab from the database. Use after manual database changes. Requires settings:write scope.',
    { confirm: z.literal(true).describe('Must be true to confirm resync') },
    async () => {
      try {
        return ok(await apiClient.post('/settings/resync'));
      } catch (e) { return fail(e); }
    }
  );
}
