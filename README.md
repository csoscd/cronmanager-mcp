# cronmanager-mcp

MCP (Model Context Protocol) server that exposes the [Cronmanager](https://github.com/csoscd/cronmanager) REST API as conversational tools for LLM clients such as Claude Desktop or Claude Code.

Example prompts:
- "Show me all failed jobs from the last 24 hours"
- "Disable job 42"
- "Create a maintenance window for Sunday night at 2 AM"
- "Export all jobs tagged 'backup' as JSON"

## Requirements

- Cronmanager 4.1.0 or later (external REST API required)
- An API key generated in the Cronmanager web UI (**API Keys** section)

## Quick start

```bash
docker run -d \
  -e CM_BASE_URL=https://cronmanager.example.com \
  -e CM_API_KEY=cm_your_api_key_here \
  -e MCP_AUTH_TOKEN=your_mcp_auth_token_here \
  -p 3000:3000 \
  cs1711/cronmanager-mcp:latest
```

Configure your MCP client to connect to `http://your-host:3000/mcp` with Bearer token `MCP_AUTH_TOKEN`.

For integration into an existing Cronmanager Docker Compose stack, see `docker-compose.snippet.yml`.

## Configuration

All configuration is via environment variables.

| Variable | Required | Default | Description |
|---|---|---|---|
| `CM_BASE_URL` | yes | — | Cronmanager web app base URL (no trailing slash) |
| `CM_API_KEY` | yes | — | Cronmanager API key (`cm_…`) |
| `CM_AGENT_ID` | no | — | Target a specific agent (sets `X-Agent-Id` header) |
| `MCP_AUTH_TOKEN` | yes | — | Bearer token protecting this MCP endpoint |
| `PORT` | no | `3000` | HTTP port |
| `TIMEOUT_MS` | no | `10000` | Cronmanager API request timeout in milliseconds |
| `LOG_LEVEL` | no | `info` | Log level: `debug`, `info`, `warn`, `error` |
| `MCP_READONLY_MODE` | no | `false` | When `true`, only read-only tools are registered |

### API key scopes

The API key must have the scopes matching the tools you intend to use:

| Scope | Tools unlocked |
|---|---|
| `jobs:read` | `list_jobs`, `get_job`, `get_job_history`, `get_timeline`, `list_tags` |
| `jobs:write` | `create_job`, `update_job`, `delete_job` |
| `jobs:execute` | `execute_job`, `kill_execution` |
| `export:read` | `export_jobs` |
| `maintenance:read` | `list_maintenance_windows`, `get_maintenance_window` |
| `maintenance:write` | `create_maintenance_window`, `update_maintenance_window`, `delete_maintenance_window` |
| `settings:read` | `get_settings`, `get_settings_section` |
| `settings:write` | `update_settings_section`, `resync_crontab` |

For read-only access, use the `read-only` profile (`jobs:read`, `maintenance:read`, `export:read`) and set `MCP_READONLY_MODE=true`.

## Tools

| Tool | Scope | Description |
|---|---|---|
| `list_jobs` | jobs:read | List cron jobs with optional filters |
| `get_job` | jobs:read | Get a single job by ID |
| `create_job` | jobs:write | Create a new cron job |
| `update_job` | jobs:write | Update a job (partial update; targets/tags are full-replaced) |
| `delete_job` | jobs:write | Delete a job |
| `execute_job` | jobs:execute | Trigger immediate one-time execution |
| `kill_execution` | jobs:execute | Kill a running execution |
| `get_job_history` | jobs:read | Execution history for a specific job |
| `get_timeline` | jobs:read | Cross-job execution timeline |
| `list_tags` | jobs:read | List all tags |
| `export_jobs` | export:read | Export jobs as JSON, CSV, or crontab text |
| `list_maintenance_windows` | maintenance:read | List maintenance windows |
| `get_maintenance_window` | maintenance:read | Get a single maintenance window |
| `create_maintenance_window` | maintenance:write | Create a maintenance window |
| `update_maintenance_window` | maintenance:write | Update a maintenance window |
| `delete_maintenance_window` | maintenance:write | Delete a maintenance window |
| `get_settings` | settings:read | Read all agent settings |
| `get_settings_section` | settings:read | Read one settings section |
| `update_settings_section` | settings:write | Update a settings section |
| `resync_crontab` | settings:write | Resync crontab from database |

### Note on `update_job`

If `targets` or `tags` are included in an `update_job` call, they **fully replace** the existing list — there is no merge. To add a single tag, first call `get_job` to read the current tags, then pass the complete updated array.

## Endpoints

| Endpoint | Description |
|---|---|
| `POST /mcp` | MCP Streamable HTTP endpoint (Bearer auth required) |
| `GET /healthz` | Liveness check (always 200, no auth required) |
| `GET /readyz` | Readiness check — pings Cronmanager API (no auth required) |

## Security

- The MCP endpoint is protected by a Bearer token (`MCP_AUTH_TOKEN`), separate from the Cronmanager API key.
- The Cronmanager API key (`CM_API_KEY`) is never exposed to MCP clients.
- Bind to a specific interface or place behind a reverse proxy if the server should not be publicly accessible.

## License

GNU General Public License version 3 or later
