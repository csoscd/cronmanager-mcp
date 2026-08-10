# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-08-10

### Fixed
- `get_job_history` and `get_timeline`: `status` enum was `'failure'` instead of the correct `'failed'` — the API has always required `failed`; using `failure` caused Zod validation to block the value before it ever reached the API
- `get_settings_section`: `performance_monitor` (available since CronManager 4.4.0) and `web` (read-only, since 4.6.0) were missing from the allowed sections enum, making them unreachable via this tool

### Added
- `get_settings_section`: now accepts `performance_monitor` and `web` sections
- `update_settings_section`: now accepts `performance_monitor`; `web` is correctly excluded (read-only, API returns 405)
- `list_agents`: description updated to document the `web_url` field added in CronManager 4.6.0
- Skill (`examples/skills/cronmanager.md`): corrected `get_timeline` description (global timeline, not per-job monitor); corrected `get_job_history` parameter list; documented all settings sections including `web` and `performance_monitor`; added `agent_id` response field note; added status-filter value note (`failed`, not `failure`)

## [0.2.1] - 2026-07-07

### Changed
- Example skill (`examples/skills/cronmanager.md`): documented `get_audit_log`, `notify_on_silence`/`silence_grace_minutes` in create_job/update_job, and two audit log workflow examples

## [0.2.0] - 2026-07-07

### Added
- `list_agents` tool: list all configured Cronmanager agents (`GET /api/v1/agents`, requires `settings:read` scope) — CronManager ≥ 4.2.0
- `agent_id` optional parameter on all tools to target a specific agent per call (overrides the global `CM_AGENT_ID` environment variable)
- `get_audit_log` tool: paginated audit log with filters (`GET /api/v1/audit`, requires `audit:read` scope, admin-only) — CronManager ≥ 4.3.4
- `create_job` / `update_job`: added `notify_on_silence` and `silence_grace_minutes` fields — CronManager ≥ 4.5.0

## [0.1.1] - 2026-06-23

### Fixed
- MCP session not registered after `initialize`: switched to `onsessioninitialized` callback so the session is stored at the correct point in the SDK lifecycle
- TLS verification failure against private CAs (e.g. stepca): added `CM_INSECURE_TLS=true` option (`NODE_TLS_REJECT_UNAUTHORIZED=0`) and documented `NODE_EXTRA_CA_CERTS` as the recommended alternative

## [0.1.0] - 2026-06-23

### Added
- Initial implementation of the Cronmanager MCP server
- 20 MCP tools covering jobs, execution history, tags, maintenance windows, export, and settings
- Bearer-token authentication for the MCP HTTP endpoint (`MCP_AUTH_TOKEN`)
- Streamable HTTP transport (MCP standard)
- `MCP_READONLY_MODE` environment variable to restrict tool registration to read-only tools at startup
- `/healthz` (liveness) and `/readyz` (readiness, pings Cronmanager API) endpoints
- Session management for concurrent MCP clients
- Multi-arch Docker image (`linux/amd64`, `linux/arm64`)
- GitHub Actions CI/CD workflows (`docker-release.yml`, `docker-dev.yml`, `auto-patch-release.yml`)
