/**
 * Handler for chat:message events
 */

import { httpClient } from '../services/http-client.ts';
import { roomManager } from '../services/room-manager.ts';
import { presenceService } from '../services/presence.ts';
import { logger } from '../utils/logger.ts';
import { NotParticipantError, ValidationError } from '../utils/errors.ts';
import type { ServerWebSocket } from 'bun';
import type { ChatMessagePayload, ChatMessageReceivedPayload } from '../types/websocket.ts';

/**
 * Handle incoming chat message
 */
export async function handleChatMessage(
  ws: ServerWebSocket<any>,
  payload: ChatMessagePayload
): Promise<void> {
  const user = presenceService.getUserByWs(ws);
  
  if (!user) {
    throw new Error('User not found in presence service');
  }

  const { chatId, content } = payload;

  // Validate payload
  if (!chatId || typeof chatId !== 'string') {
    throw new ValidationError('Invalid chatId');
  }

  if (!content || typeof content !== 'string') {
    throw new ValidationError('Invalid message content');
  }

  if (content.length === 0) {
    throw new ValidationError('Message content cannot be empty');
  }

  // Check if user is participant in this chat
  if (!user.chatRooms.has(chatId)) {
    logger.warn('User attempted to send message to chat they are not part of', {
      userId: user.userId,
      chatId,
    });
    throw new NotParticipantError('You are not a participant in this chat');
  }

  // Send message via HTTP API (this persists it to database)
  const response = await httpClient.sendMessage(chatId, content, user.token);
  
  logger.messageSent(chatId, user.userId, response.message.id);

  // Broadcast message to all participants EXCEPT sender
  const messagePayload: ChatMessageReceivedPayload = {
    chatId,
    message: response.message,
  };

  const messageStr = JSON.stringify({
    type: 'chat:message',
    payload: messagePayload,
  });

  roomManager.broadcastToRoom(chatId, messageStr, ws);
}
