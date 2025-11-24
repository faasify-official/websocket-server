/**
 * Chat and Message types matching the DynamoDB schema
 */

export interface Message {
  id: string;              // UUID
  chatId: string;          // UUID
  senderId: string;        // userId
  senderName: string;
  content: string;
  createdAt: string;       // ISO-8601
  readAt?: string;         // ISO-8601
}

export interface LastMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  createdAt: string;
}

export interface Chat {
  id: string;                    // UUID
  participants: string[];        // Array of userIds
  participantNames: string[];    // Array of user names
  storeId?: string;
  storeName?: string;
  lastMessage?: LastMessage;
  unreadCount?: number;          // Per-participant
  createdAt: string;
  updatedAt: string;
}

export interface ChatsResponse {
  chats: Chat[];
}

export interface ChatResponse {
  chat: Chat;
}

export interface MessagesResponse {
  messages: Message[];
  nextToken?: string;
}

export interface CreateMessageRequest {
  content: string;
}

export interface CreateMessageResponse {
  message: Message;
}
