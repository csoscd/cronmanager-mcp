# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- `list_agents` tool: list all configured Cronmanager agents (`GET /api/v1/agents`, requires `settings:read` scope)
- `agent_id` optional parameter on all tools to target a specific agent per call (overrides the global `CM_AGENT_ID` environment variable)

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
