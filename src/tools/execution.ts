// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { apiClient } from '../apiClient.js';
import { ok, fail } from '../toolHelpers.js';

export function registerExecutionTools(server: McpServer, readOnly: boolean): void {
  server.tool(
    'get_job_history',
    'Get execution history for a specific job.',
    {
      id: z.number().int().positive().describe('Job ID'),
      status: z.enum(['success', 'failure', 'running']).optional().describe('Filter by execution status'),
      limit: z.number().int().min(1).max(500).optional().describe('Max results (default 50)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
    },
    async ({ id, status, limit, offset }) => {
      try {
        return ok(await apiClient.get(`/jobs/${id}/history`, { status, limit, offset }));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'get_timeline',
    'Get execution history across all jobs (timeline view).',
    {
      status: z.enum(['success', 'failure', 'running']).optional().describe('Filter by execution status'),
      tag: z.string().optional().describe('Filter by job tag'),
      limit: z.number().int().min(1).max(500).optional().describe('Max results (default 100)'),
      offset: z.number().int().min(0).optional().describe('Pagination offset (default 0)'),
    },
    async ({ status, tag, limit, offset }) => {
      try {
        return ok(await apiClient.get('/timeline', { status, tag, limit, offset }));
      } catch (e) { return fail(e); }
    }
  );

  if (readOnly) return;

  server.tool(
    'execute_job',
    'Trigger an immediate one-time execution of a cron job. Runs via the cron daemon — expect up to 60 seconds of delay.',
    { id: z.number().int().positive().describe('Job ID') },
    async ({ id }) => {
      try {
        return ok(await apiClient.post(`/jobs/${id}/execute`));
      } catch (e) { return fail(e); }
    }
  );

  server.tool(
    'kill_execution',
    'Kill a currently running execution by its execution log ID.',
    {
      executionId: z.number().int().positive().describe('Execution log ID'),
      confirm: z.literal(true).describe('Must be true to confirm kill'),
    },
    async ({ executionId }) => {
      try {
        return ok(await apiClient.post(`/executions/${executionId}/kill`));
      } catch (e) { return fail(e); }
    }
  );
}
