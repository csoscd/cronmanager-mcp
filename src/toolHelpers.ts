// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { ApiHttpError, ApiUnreachableError } from './apiClient.js';

type TextContent = { type: 'text'; text: string };
type ToolResult = { content: TextContent[]; isError?: boolean };

export function ok(data: unknown): ToolResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
}

export function okText(text: string): ToolResult {
  return { content: [{ type: 'text', text }] };
}

export function fail(e: unknown): ToolResult {
  let text: string;

  if (e instanceof ApiHttpError) {
    const body = e.body as Record<string, unknown>;
    const parts: string[] = [`HTTP ${e.status}`];
    if (typeof body['error'] === 'string') parts.push(body['error']);
    if (typeof body['message'] === 'string') parts.push(body['message']);
    if (body['fields']) parts.push(`Validation errors: ${JSON.stringify(body['fields'])}`);
    text = parts.join(' – ');
  } else if (e instanceof ApiUnreachableError) {
    text = e.message;
  } else {
    text = String(e);
  }

  return { content: [{ type: 'text', text }], isError: true };
}
