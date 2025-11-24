/**
 * WebSocket message types for client-server communication
 */

import type { Chat, Message } from './chat.ts';

// Base WebSocket message structure
export interface WebSocketMessage<T = any> {
  type: string;
  payload: T;
}

// ============================================
// Client -> Server Messages
// ============================================

export interface ChatMessagePayload {
  chatId: string;
  content: string;
}

export interface ChatReadPayload {
  chatId: string;
  messageId: string;
}

export interface ChatTypingPayload {
  chatId: string;
  isTyping: boolean;
}

export interface PingPayload {
  timestamp?: string;
}

// ============================================
// Server -> Client Messages
// ============================================

export interface ChatMessageReceivedPayload {
  chatId: string;
  message: Message;
}

export interface ChatNewPayload {
  chatId: string;
  chat?: Chat;
}

export interface ChatMessageReadPayload {
  chatId: string;
  messageId: string;
  userId: string;
  readAt: string;
}

export interface ChatUserTypingPayload {
  chatId: string;
  userId: string;
  userName: string;
  isTyping: boolean;
}

export interface UserOnlinePayload {
  userId: string;
  online: boolean;
}

export interface ChatUpdatedPayload {
  chatId: string;
  chat: Chat;
}

export interface PongPayload {
  timestamp: string;
}

export interface ConnectedPayload {
  userId: string;
  chatIds: string[];
}

export interface ErrorPayload {
  code: 'AUTH_FAILED' | 'INVALID_MESSAGE' | 'NOT_PARTICIPANT' | 'HTTP_ERROR' | 'INTERNAL_ERROR' | 'VALIDATION_ERROR';
  message: string;
  details?: any;
}

// ============================================
// Message Type Definitions
// ============================================

export type ClientMessage =
  | WebSocketMessage<ChatMessagePayload>
  | WebSocketMessage<ChatReadPayload>
  | WebSocketMessage<ChatTypingPayload>
  | WebSocketMessage<PingPayload>;

export type ServerMessage =
  | WebSocketMessage<ChatMessageReceivedPayload>
  | WebSocketMessage<ChatNewPayload>
  | WebSocketMessage<ChatMessageReadPayload>
  | WebSocketMessage<ChatUserTypingPayload>
  | WebSocketMessage<UserOnlinePayload>
  | WebSocketMessage<ChatUpdatedPayload>
  | WebSocketMessage<PongPayload>
  | WebSocketMessage<ConnectedPayload>
  | WebSocketMessage<ErrorPayload>;

// Message type constants
export const MessageTypes = {
  // Client -> Server
  CHAT_MESSAGE: 'chat:message',
  CHAT_READ: 'chat:read',
  CHAT_TYPING: 'chat:typing',
  PING: 'ping',
  
  // Server -> Client
  CHAT_MESSAGE_RECEIVED: 'chat:message',
  CHAT_NEW: 'chat:new',
  CHAT_READ_RECEIVED: 'chat:read',
  CHAT_USER_TYPING: 'chat:typing',
  USER_ONLINE: 'user:online',
  CHAT_UPDATED: 'chat:updated',
  PONG: 'pong',
  CONNECTED: 'connected',
  ERROR: 'error',
} as const;
