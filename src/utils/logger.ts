import { CONFIG } from "../config";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level >= this.level) {
      const timestamp = new Date().toISOString();
      const levelStr = LogLevel[level];
      const prefix = `[${timestamp}] [${levelStr}]`;
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(prefix, message, ...args);
          break;
        case LogLevel.INFO:
          console.info(prefix, message, ...args);
          break;
        case LogLevel.WARN:
          console.warn(prefix, message, ...args);
          break;
        case LogLevel.ERROR:
          console.error(prefix, message, ...args);
          break;
      }
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }

  setLevel(level: LogLevel) {
    this.level = level;
  }
}

// Export singleton instance
export const logger = new Logger(
  CONFIG.FEATURES.DETAILED_LOGGING ? LogLevel.DEBUG : LogLevel.INFO
);

// Convenience functions
export const logApiCall = (endpoint: string, params: any) => {
  logger.debug(`API call to ${endpoint}`, params);
};

export const logCacheHit = (key: string) => {
  logger.debug(`Cache hit for key: ${key}`);
};

export const logCacheMiss = (key: string) => {
  logger.debug(`Cache miss for key: ${key}`);
};

export const logValidationError = (field: string, value: any, reason: string) => {
  logger.warn(`Validation error for ${field}:`, { value, reason });
};

export const logToolExecution = (toolName: string, args: any) => {
  logger.info(`Executing tool: ${toolName}`, args);
}; 