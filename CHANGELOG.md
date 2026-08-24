# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.0] - 2026-08-24

### Added
- `list_linux_users` tool: list all Linux users available for cron job scheduling on the selected agent; includes `docker_mode` flag (`GET /api/v1/linux-users`, requires `jobs:read` scope, CronManager ≥ 4.8.0)
- `list_targets` tool: list all distinct execution targets with job counts; optional `active` filter (`GET /api/v1/targets`, requires `jobs:read` scope, CronManager ≥ 4.8.0)
- `purge_logs` tool: immediately delete finished execution log rows that exceed the retention policy (`POST /api/v1/maintenance/logs/purge`, requires `maintenance:write` scope, CronManager ≥ 4.8.0)
- `cleanup_history` tool: permanently delete all finished execution logs older than N days; optional `older_than_days` (default 90, min 1) (`POST /api/v1/maintenance/history/cleanup`, requires `maintenance:write` scope, CronManager ≥ 4.8.0)
- `cleanup_once_entries` tool: remove stale run-once crontab entries left behind by failed Run Now self-cleanup (`POST /api/v1/maintenance/once/cleanup`, requires `maintenance:write` scope, CronManager ≥ 4.8.0)
- Skill (`examples/skills/cronmanager.md`): documented all five new tools with workflows; completed optional job field table for `create_job`/`update_job` (previously missing `notify_on_recovery`, `notify_after_failures`, `notify_after_limit_exceeded`, `run_in_maintenance`, `retention_days`, `restart_on_exitcodes`); documented `last_silence_alert_at` as read-only job field

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
