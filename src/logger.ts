// @author Christian Schulz <technik@meinetechnikwelt.rocks>
// @license GNU General Public License version 3 or later

'use strict';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

class Logger {
  private readonly minLevel: number;

  constructor(level: LogLevel) {
    this.minLevel = LEVELS[level];
  }

  private write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    if (LEVELS[level] < this.minLevel) return;
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, message, ...meta });
    if (level === 'error') process.stderr.write(entry + '\n');
    else process.stdout.write(entry + '\n');
  }

  debug(message: string, meta?: Record<string, unknown>): void { this.write('debug', message, meta); }
  info(message: string, meta?: Record<string, unknown>): void { this.write('info', message, meta); }
  warn(message: string, meta?: Record<string, unknown>): void { this.write('warn', message, meta); }
  error(message: string, meta?: Record<string, unknown>): void { this.write('error', message, meta); }
}

const rawLevel = process.env['LOG_LEVEL'];
const level: LogLevel =
  rawLevel === 'debug' || rawLevel === 'info' || rawLevel === 'warn' || rawLevel === 'error'
    ? rawLevel
    : 'info';

export const logger = new Logger(level);
