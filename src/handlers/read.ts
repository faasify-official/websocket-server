/**
 * Handler for chat:read events (read receipts)
 */

import { httpClient } from '../services/http-client.ts';
import { roomManager } from '../services/room-manager.ts';
import { presenceService } from '../services/presence.ts';
import { logger } from '../utils/logger.ts';
import { NotParticipantError, ValidationError } from '../utils/errors.ts';
import type { ServerWebSocket } from 'bun';
import type { ChatReadPayload, ChatMessageReadPayload } from '../types/websocket.ts';

/**
 * Handle read receipt for a message
 */
export async function handleChatRead(
  ws: ServerWebSocket<any>,
  payload: ChatReadPayload
): Promise<void> {
  const user = presenceService.getUserByWs(ws);
  
  if (!user) {
    throw new Error('User not found in presence service');
  }

  const { chatId, messageId } = payload;

  // Validate payload
  if (!chatId || typeof chatId !== 'string') {
    throw new ValidationError('Invalid chatId');
  }

  if (!messageId || typeof messageId !== 'string') {
    throw new ValidationError('Invalid messageId');
  }

  // Check if user is participant in this chat
  if (!user.chatRooms.has(chatId)) {
    logger.warn('User attempted to mark message as read in chat they are not part of', {
      userId: user.userId,
      chatId,
    });
    throw new NotParticipantError('You are not a participant in this chat');
  }

  // Mark as read via HTTP API
  await httpClient.markMessageAsRead(chatId, messageId, user.token);
  
  logger.messageRead(chatId, messageId, user.userId);

  // Notify the message sender about the read receipt
  const readPayload: ChatMessageReadPayload = {
    chatId,
    messageId,
    userId: user.userId,
    readAt: new Date().toISOString(),
  };

  const messageStr = JSON.stringify({
    type: 'chat:read',
    payload: readPayload,
  });

  // Broadcast to all participants in the chat (so sender sees it)
  // Alternatively, we could send only to the message sender, but broadcasting
  // to all allows multiple devices to stay in sync
  roomManager.broadcastToRoom(chatId, messageStr, ws);
}
