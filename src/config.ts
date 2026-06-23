// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

export const APP_VERSION = process.env['APP_VERSION'] ?? 'dev';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Config {
  CM_BASE_URL: string;
  CM_API_KEY: string;
  CM_AGENT_ID: string | undefined;
  MCP_AUTH_TOKEN: string;
  PORT: number;
  TIMEOUT_MS: number;
  LOG_LEVEL: LogLevel;
  MCP_READONLY_MODE: boolean;
}

function require(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function parseLogLevel(raw: string | undefined): LogLevel {
  if (raw === 'debug' || raw === 'info' || raw === 'warn' || raw === 'error') return raw;
  return 'info';
}

function buildConfig(): Config {
  return {
    CM_BASE_URL: require('CM_BASE_URL').replace(/\/$/, ''),
    CM_API_KEY: require('CM_API_KEY'),
    CM_AGENT_ID: process.env['CM_AGENT_ID'] || undefined,
    MCP_AUTH_TOKEN: require('MCP_AUTH_TOKEN'),
    PORT: parseInt(process.env['PORT'] ?? '3000', 10),
    TIMEOUT_MS: parseInt(process.env['TIMEOUT_MS'] ?? '10000', 10),
    LOG_LEVEL: parseLogLevel(process.env['LOG_LEVEL']),
    MCP_READONLY_MODE: process.env['MCP_READONLY_MODE'] === 'true',
  };
}

export const config = buildConfig();
