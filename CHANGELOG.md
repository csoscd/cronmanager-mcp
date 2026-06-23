# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Initial implementation of the Cronmanager MCP server
- 20 MCP tools covering jobs, execution history, tags, maintenance windows, export, and settings
- Bearer-token authentication for the MCP HTTP endpoint (`MCP_AUTH_TOKEN`)
- Streamable HTTP transport (MCP standard)
- `MCP_READONLY_MODE` environment variable to restrict tool registration to read-only tools at startup
- `/healthz` (liveness) and `/readyz` (readiness, pings Cronmanager API) endpoints
- Session management for concurrent MCP clients
- Multi-arch Docker image (`linux/amd64`, `linux/arm64`)
- GitHub Actions CI/CD workflows (`docker-release.yml`, `docker-dev.yml`)
