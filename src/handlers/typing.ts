/**
 * Handler for chat:typing events (typing indicators)
 */

import { config } from '../config/env.ts';
import { roomManager } from '../services/room-manager.ts';
import { presenceService } from '../services/presence.ts';
import { logger } from '../utils/logger.ts';
import { NotParticipantError, ValidationError } from '../utils/errors.ts';
import type { ServerWebSocket } from 'bun';
import type { ChatTypingPayload, ChatUserTypingPayload } from '../types/websocket.ts';

/**
 * Handle typing indicator
 */
export function handleChatTyping(
  ws: ServerWebSocket<any>,
  payload: ChatTypingPayload
): void {
  const user = presenceService.getUserByWs(ws);
  
  if (!user) {
    throw new Error('User not found in presence service');
  }

  const { chatId, isTyping } = payload;

  // Validate payload
  if (!chatId || typeof chatId !== 'string') {
    throw new ValidationError('Invalid chatId');
  }

  if (typeof isTyping !== 'boolean') {
    throw new ValidationError('Invalid isTyping value');
  }

  // Check if user is participant in this chat
  if (!user.chatRooms.has(chatId)) {
    logger.warn('User attempted to send typing indicator to chat they are not part of', {
      userId: user.userId,
      chatId,
    });
    throw new NotParticipantError('You are not a participant in this chat');
  }

  logger.typingIndicator(chatId, user.userId, isTyping);

  // Broadcast typing indicator to all participants EXCEPT sender
  const typingPayload: ChatUserTypingPayload = {
    chatId,
    userId: user.userId,
    userName: user.userName,
    isTyping,
  };

  const messageStr = JSON.stringify({
    type: 'chat:typing',
    payload: typingPayload,
  });

  roomManager.broadcastToRoom(chatId, messageStr, ws);

  // If user is typing, set a timeout to automatically send "stopped typing" after N seconds
  if (isTyping) {
    // Clear any existing timer for this chat
    presenceService.clearTypingTimer(user.userId, chatId);

    // Set new timer
    const timer = setTimeout(() => {
      // Auto-send "stopped typing" after timeout
      const stoppedTypingPayload: ChatUserTypingPayload = {
        chatId,
        userId: user.userId,
        userName: user.userName,
        isTyping: false,
      };

      const stoppedMessageStr = JSON.stringify({
        type: 'chat:typing',
        payload: stoppedTypingPayload,
      });

      roomManager.broadcastToRoom(chatId, stoppedMessageStr, ws);
      
      logger.debug('Auto-stopped typing indicator', { userId: user.userId, chatId });
    }, config.typingTimeout);

    presenceService.setTypingTimer(user.userId, chatId, timer);
  } else {
    // User explicitly stopped typing, clear the timer
    presenceService.clearTypingTimer(user.userId, chatId);
  }
}
