// Shared logger utility for OneCredit extension
// Provides consistent logging across all extension scripts

const EXTENSION_LOGGER_PREFIX = '[OneCredit]';

enum LogLevel {
  LOG = 'log',
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
}

class ExtensionLogger {
  private isDevelopment: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  private shouldLog(level: LogLevel): boolean {
    if (level === LogLevel.ERROR || level === LogLevel.WARN) {
      return true;
    }
    return this.isDevelopment;
  }

  log(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.LOG)) {
      console.log(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }

  error(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }

  info(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(EXTENSION_LOGGER_PREFIX, ...args);
    }
  }
}

export const logger = new ExtensionLogger();
