/**
 * Custom error classes for WebSocket server
 */

export class WebSocketError extends Error {
  constructor(
    public code: string,
    message: string,
    public details?: any
  ) {
    super(message);
    this.name = 'WebSocketError';
  }
}

export class AuthenticationError extends WebSocketError {
  constructor(message: string, details?: any) {
    super('AUTH_FAILED', message, details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends WebSocketError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', message, details);
    this.name = 'ValidationError';
  }
}

export class NotParticipantError extends WebSocketError {
  constructor(message: string, details?: any) {
    super('NOT_PARTICIPANT', message, details);
    this.name = 'NotParticipantError';
  }
}

export class HttpError extends WebSocketError {
  constructor(message: string, public statusCode?: number, details?: any) {
    super('HTTP_ERROR', message, details);
    this.name = 'HttpError';
  }
}

export class InternalError extends WebSocketError {
  constructor(message: string, details?: any) {
    super('INTERNAL_ERROR', message, details);
    this.name = 'InternalError';
  }
}
