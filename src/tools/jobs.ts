// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const targetsWarning = 'WARNING: if provided, completely replaces the existing target list.';
const tagsWarning = 'WARNING: if provided, completely replaces the existing tag list.';

const agentId = z.number().int().positive().optional()
  .describe('Target a specific agent (multi-agent setup). Omit to use the default agent.');

const jobWriteFields = {
  description: z.string().optional().describe('Human-readable label'),
  active: z.boolean().optional().describe('Whether the job is active'),
  notify_on_failure: z.boolean().optional(),
  notify_on_recovery: z.boolean().optional(),
  notify_after_failures: z.number().int().optional().describe('Notify after N consecutive failures'),
  notify_after_limit_exceeded: z.boolean().optional(),
  execution_limit_seconds: z.number().int().optional().describe('Max runtime in seconds (0 = unlimited)'),
  auto_kill_on_limit: z.boolean().optional(),
  singleton: z.boolean().optional().describe('Prevent overlapping executions'),
  run_in_maintenance: z.boolean().optional().describe('Allow execution during maintenance windows'),
  retention_days: z.number().int().optional().describe('Keep execution history for N days (0 = forever)'),
  retry_count: z.number().int().optional().describe('Number of retries on failure'),
  retry_delay_minutes: z.number().int().optional().describe('Delay between retries'),
  restart_on_exitcodes: z.array(z.number().int()).optional().describe('Exit codes that trigger a retry'),
};

export function registerJobTools(server: McpServer, readOnly: boolean): void {
  server.tool(
    'list_jobs',
    'List cron jobs. Supports filtering by tag, user, target, and active state.',
    {
      tag: z.string().optional().describe('Filter by tag name'),
      user: z.string().optional().describe('Filter by Linux user'),
      target: z.string().optional().describe('Filter by execution target'),
      active: z.boolean().optional().describe('true = active only, false = inactive only'),
      limit: z.number().int().min(1).max(500).optional().describe('Max results (default 100)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
      agent_id: agentId,
    },
    async ({ agent_id, tag, user, target, active, limit, offset }) => {
      try {
        return ok(await apiClient.get('/jobs', { tag, user, target, active, limit, offset }, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_job',
    'Get a single cron job by ID.',
    {
      id: z.number().int().positive().describe('Job ID'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.get(`/jobs/${id}`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  if (readOnly) return;

  server.tool(
    'create_job',
    'Create a new cron job. Required: linux_user, schedule, command, targets.',
    {
      linux_user: z.string().min(1).describe('Linux user to run the job as'),
      schedule: z.string().min(1).describe('Cron expression, e.g. "0 3 * * *"'),
      command: z.string().min(1).describe('Command to execute'),
      targets: z.array(z.string()).min(1).describe('Execution target(s), e.g. ["local"]'),
      tags: z.array(z.string()).optional().describe('Tag names to assign'),
      agent_id: agentId,
      ...jobWriteFields,
    },
    async ({ agent_id, ...args }) => {
      try {
        return ok(await apiClient.post('/jobs', args, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'update_job',
    [
      'Update a cron job. Only fields present in the request are changed.',
      'IMPORTANT: If "targets" or "tags" are included, they FULLY REPLACE the existing list.',
      'To add a single tag, first call get_job to read the current tags,',
      'then pass the complete updated list.',
    ].join(' '),
    {
      id: z.number().int().positive().describe('Job ID'),
      linux_user: z.string().min(1).optional().describe('Linux user to run the job as'),
      schedule: z.string().optional().describe('Cron expression'),
      command: z.string().min(1).optional().describe('Command to execute'),
      targets: z.array(z.string()).optional().describe(targetsWarning),
      tags: z.array(z.string()).optional().describe(tagsWarning),
      agent_id: agentId,
      ...jobWriteFields,
    },
    async ({ id, agent_id, ...fields }) => {
      try {
        return ok(await apiClient.put(`/jobs/${id}`, fields, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'delete_job',
    'Delete a cron job and remove it from the crontab.',
    {
      id: z.number().int().positive().describe('Job ID'),
      confirm: z.literal(true).describe('Must be true to confirm deletion'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.delete(`/jobs/${id}`, agent_id));
      } catch (e) { return fail(e); }
    }
  );
}
