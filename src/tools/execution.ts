// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

const agentId = z.number().int().positive().optional()
  .describe('Target a specific agent (multi-agent setup). Omit to use the default agent.');

const statusWithSkipped = z.enum(['success', 'failed', 'running', 'skipped'])
  .describe('Filter by status. "failed" excludes maintenance-skipped entries (exit_code -4); use "skipped" to retrieve those.');

export function registerExecutionTools(server: McpServer, readOnly: boolean): void {
  server.tool(
    'get_job_history',
    'Get execution history for a specific job.',
    {
      id: z.number().int().positive().describe('Job ID'),
      status: statusWithSkipped.optional(),
      unacknowledged_only: z.boolean().optional()
        .describe('true = only return executions where acknowledged_at is null'),
      limit: z.number().int().min(1).max(500).optional().describe('Max results (default 50)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
      agent_id: agentId,
    },
    async ({ id, status, unacknowledged_only, limit, offset, agent_id }) => {
      try {
        return ok(await apiClient.get(`/jobs/${id}/history`, {
          status,
          unacknowledged_only: unacknowledged_only !== undefined ? (unacknowledged_only ? 1 : 0) : undefined,
          limit,
          offset,
        }, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_timeline',
    'Get execution history across all jobs (timeline view).',
    {
      status: statusWithSkipped.optional(),
      tag: z.string().optional().describe('Filter by job tag'),
      limit: z.number().int().min(1).max(500).optional().describe('Max results (default 100)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
      agent_id: agentId,
    },
    async ({ status, tag, limit, offset, agent_id }) => {
      try {
        return ok(await apiClient.get('/timeline', { status, tag, limit, offset }, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'check_job_dependency',
    'Check whether a job\'s dependency is currently satisfied. Returns {satisfied: bool, reason: string}. Useful for debugging why a "requires"-type job is being skipped. Requires jobs:read scope. CronManager ≥ 7.0.0.',
    {
      id: z.number().int().positive().describe('Job ID'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.get(`/jobs/${id}/dependency-check`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  if (readOnly) return;

  server.tool(
    'execute_job',
    'Trigger an immediate one-time execution of a cron job. Runs via the cron daemon — expect up to 60 seconds of delay.',
    {
      id: z.number().int().positive().describe('Job ID'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.post(`/jobs/${id}/execute`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'kill_execution',
    'Kill a currently running execution by its execution log ID.',
    {
      executionId: z.number().int().positive().describe('Execution log ID'),
      confirm: z.literal(true).describe('Must be true to confirm kill'),
      agent_id: agentId,
    },
    async ({ executionId, agent_id }) => {
      try {
        return ok(await apiClient.post(`/executions/${executionId}/kill`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'acknowledge_execution',
    'Mark a finished execution as acknowledged. Acknowledged failures are suppressed from the dashboard error indicators; the historical record stays intact. Requires executions:acknowledge scope. CronManager ≥ 6.0.0.',
    {
      executionId: z.number().int().positive().describe('Execution log ID'),
      agent_id: agentId,
    },
    async ({ executionId, agent_id }) => {
      try {
        return ok(await apiClient.post(`/executions/${executionId}/acknowledge`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'unacknowledge_execution',
    'Clear the acknowledgement on a previously acknowledged execution, making it visible again in the dashboard. Requires executions:acknowledge scope. CronManager ≥ 6.0.0.',
    {
      executionId: z.number().int().positive().describe('Execution log ID'),
      agent_id: agentId,
    },
    async ({ executionId, agent_id }) => {
      try {
        return ok(await apiClient.delete(`/executions/${executionId}/acknowledge`, agent_id));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'acknowledge_all_job_executions',
    'Bulk-acknowledge all unacknowledged failed executions for a job in one step. Only finished, non-zero-exit-code, unacknowledged executions are updated. Returns acknowledged_count. Requires executions:acknowledge scope. CronManager ≥ 7.0.0.',
    {
      id: z.number().int().positive().describe('Job ID'),
      agent_id: agentId,
    },
    async ({ id, agent_id }) => {
      try {
        return ok(await apiClient.post(`/jobs/${id}/acknowledge-all`, undefined, agent_id));
      } catch (e) { return fail(e); }
    }
  );
}
