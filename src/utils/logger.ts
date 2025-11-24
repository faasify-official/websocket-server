/**
 * Structured logging utility
 */

import { config } from '../config/env.ts';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

const LOG_LEVEL_MAP: Record<string, LogLevel> = {
  debug: LogLevel.DEBUG,
  info: LogLevel.INFO,
  warn: LogLevel.WARN,
  error: LogLevel.ERROR,
};

class Logger {
  private level: LogLevel;

  constructor() {
    const configLevel = config.logLevel.toLowerCase();
    this.level = LOG_LEVEL_MAP[configLevel] ?? LogLevel.INFO;
    // Log the configured level on startup
    console.log(`[Logger] Initialized with level: ${config.logLevel} (numeric: ${this.level}, name: ${LogLevel[this.level]})`);
  }

  private log(level: LogLevel, message: string, data?: any) {
    if (level < this.level) return;

    const timestamp = new Date().toISOString();
    const levelName = LogLevel[level];
    
    const logEntry = {
      timestamp,
      level: levelName,
      message,
      ...(data && { data }),
    };

    const output = JSON.stringify(logEntry);

    if (level === LogLevel.ERROR) {
      console.error(output);
    } else if (level === LogLevel.WARN) {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, data?: any) {
    this.log(LogLevel.DEBUG, message, data);
  }

  info(message: string, data?: any) {
    this.log(LogLevel.INFO, message, data);
  }

  warn(message: string, data?: any) {
    this.log(LogLevel.WARN, message, data);
  }

  error(message: string, error?: any, data?: any) {
    const errorData = {
      ...data,
      ...(error && {
        error: {
          message: error.message,
          stack: error.stack,
          code: error.code,
          ...(error.details && { details: error.details }),
        },
      }),
    };
    this.log(LogLevel.ERROR, message, errorData);
  }

  // Specialized logging methods
  userConnected(userId: string, chatIds: string[]) {
    this.info('User connected', { userId, chatCount: chatIds.length, chatIds });
  }

  userDisconnected(userId: string) {
    this.info('User disconnected', { userId });
  }

  messageSent(chatId: string, userId: string, messageId: string) {
    this.info('Message sent', { chatId, userId, messageId });
  }

  messageRead(chatId: string, messageId: string, userId: string) {
    this.info('Message read', { chatId, messageId, userId });
  }

  typingIndicator(chatId: string, userId: string, isTyping: boolean) {
    this.debug('Typing indicator', { chatId, userId, isTyping });
  }

  httpRequest(method: string, endpoint: string, statusCode?: number, duration?: number) {
    this.debug('HTTP API request', { method, endpoint, statusCode, duration });
  }

  authFailure(reason: string, details?: any) {
    this.warn('Authentication failed', { reason, details });
  }
}

export const logger = new Logger();
