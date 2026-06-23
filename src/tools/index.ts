// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerJobTools } from './jobs.js';
import { registerExecutionTools } from './execution.js';
import { registerTagTools } from './tags.js';
import { registerMaintenanceTools } from './maintenance.js';
import { registerExportTools } from './export.js';
import { registerSettingsTools } from './settings.js';
import { registerAgentTools } from './agents.js';

export function registerAllTools(server: McpServer, readOnly: boolean): void {
  registerAgentTools(server);
  registerJobTools(server, readOnly);
  registerExecutionTools(server, readOnly);
  registerTagTools(server);
  registerMaintenanceTools(server, readOnly);
  registerExportTools(server);
  registerSettingsTools(server, readOnly);
}
