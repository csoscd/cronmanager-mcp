// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const agentId = z.number().int().positive().optional()
  .describe('Target a specific agent (multi-agent setup). Omit to use the default agent.');

export function registerMaintenanceTools(server: McpServer, readOnly: boolean): void {
  server.tool(
    'list_maintenance_windows',
    'List all maintenance windows.',
    { agent_id: agentId },
    async ({ agent_id }) => {
      try {
        return ok(await apiClient.get('/maintenance/windows', undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_maintenance_window',
    'Get a single maintenance window by ID.',
    {
      id: z.number().int().positive().describe('Maintenance window ID'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.get(`/maintenance/windows/${id}`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  if (readOnly) return;

  server.tool(
    'create_maintenance_window',
    'Create a maintenance window. Required: target, cron_schedule, duration_minutes.',
    {
      target: z.string().min(1).describe('Execution target this window applies to'),
      cron_schedule: z.string().min(1).describe('Cron expression defining when the window starts'),
      duration_minutes: z.number().int().positive().describe('Duration in minutes'),
      description: z.string().optional().describe('Human-readable label'),
      active: z.boolean().optional().describe('Whether this window is active (default true)'),
      agent_id: agentId,
    },
    async ({ agent_id, ...args }) => {
      try {
        return ok(await apiClient.post('/maintenance/windows', args, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'update_maintenance_window',
    'Update a maintenance window. Only supplied fields are changed.',
    {
      id: z.number().int().positive().describe('Maintenance window ID'),
      target: z.string().optional().describe('Execution target'),
      cron_schedule: z.string().optional().describe('Cron expression'),
      duration_minutes: z.number().int().positive().optional().describe('Duration in minutes'),
      description: z.string().optional().describe('Human-readable label'),
      active: z.boolean().optional().describe('Whether this window is active'),
      agent_id: agentId,
    },
    async ({ id, agent_id, ...fields }) => {
      try {
        return ok(await apiClient.put(`/maintenance/windows/${id}`, fields, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'delete_maintenance_window',
    'Delete a maintenance window.',
    {
      id: z.number().int().positive().describe('Maintenance window ID'),
      confirm: z.literal(true).describe('Must be true to confirm deletion'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.delete(`/maintenance/windows/${id}`, agent_id));
      } catch (e) { return fail(e); }
    }
  );
}
