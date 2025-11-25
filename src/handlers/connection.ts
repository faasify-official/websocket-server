/**
 * Connection lifecycle handlers
 */

import { authenticateConnection, extractToken } from '../auth/jwt.ts';
import { httpClient } from '../services/http-client.ts';
import { roomManager } from '../services/room-manager.ts';
import { presenceService } from '../services/presence.ts';
import { logger } from '../utils/logger.ts';
import { AuthenticationError } from '../utils/errors.ts';
import type { ServerWebSocket } from 'bun';
import type { ConnectedUser } from '../types/user.ts';
import type { ConnectedPayload, ErrorPayload } from '../types/websocket.ts';

/**
 * Send error message to WebSocket client
 */
function sendError(ws: ServerWebSocket<any>, error: ErrorPayload): void {
  const message = JSON.stringify({
    type: 'error',
    payload: error,
  });
  
  try {
    ws.send(message);
  } catch (err) {
    logger.error('Failed to send error message', err);
  }
}

/**
 * Handle new WebSocket connection
 */
export async function handleConnection(
  ws: ServerWebSocket<any>,
  request: Request
): Promise<void> {
  try {
    // Extract and verify JWT token
    const url = request.url;
    const headers = request.headers;
    
    const token = extractToken(url, headers);
    if (!token) {
      logger.authFailure('No token provided');
      sendError(ws, {
        code: 'AUTH_FAILED',
        message: 'No authentication token provided',
      });
      ws.close(4001, 'Authentication failed');
      return;
    }

    // Authenticate via HTTP API
    const userProfile = await authenticateConnection(url, headers);

    // Extract user info from profile
    const userId = userProfile.userId;
    const userName = userProfile.name;
    const email = userProfile.email;
    const role = userProfile.role;

    // Fetch user's chats from HTTP API
    let chatIds: string[] = [];
    try {
      const chatsResponse = await httpClient.getChats(token);
      chatIds = chatsResponse.chats.map(chat => chat.id);
    } catch (error) {
      logger.error('Failed to fetch user chats', error, { userId });
      // Continue anyway - user can still connect, just won't be in any rooms yet
    }

    // Create connected user record
    const connectedUser: ConnectedUser = {
      userId,
      userName,
      email,
      role,
      ws,
      token,
      chatRooms: new Set(chatIds),
      connectedAt: new Date(),
      typingTimers: new Map(),
    };

    // Add user to presence service
    presenceService.addUser(connectedUser);

    // Join all chat rooms
    for (const chatId of chatIds) {
      roomManager.joinRoom(chatId, ws);
    }

    // Send confirmation to client first
    const connectedPayload: ConnectedPayload = {
      userId,
      chatIds,
    };

    ws.send(JSON.stringify({
      type: 'connected',
      payload: connectedPayload,
    }));

    // Send online status of all already-connected users in the same chats
    const onlineUsers = new Set<string>();
    for (const chatId of chatIds) {
      const participants = roomManager.getRoomParticipants(chatId);
      for (const participantWs of participants) {
        const participant = presenceService.getUserByWs(participantWs);
        if (participant && participant.userId !== userId && !onlineUsers.has(participant.userId)) {
          // Send this user's online status to the newly connected user
          ws.send(JSON.stringify({
            type: 'user:online',
            payload: {
              userId: participant.userId,
              online: true,
            },
          }));
          onlineUsers.add(participant.userId);
        }
      }
    }

    // Broadcast this user's online status to all chat participants
    presenceService.broadcastPresence(userId, true, chatIds);

    logger.userConnected(userId, chatIds);
  } catch (error) {
    if (error instanceof AuthenticationError) {
      logger.authFailure('Authentication failed', { message: error.message });
      sendError(ws, {
        code: 'AUTH_FAILED',
        message: error.message,
        details: error.details,
      });
      ws.close(4001, 'Authentication failed');
    } else {
      logger.error('Connection handler failed', error);
      sendError(ws, {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
      });
      ws.close(1011, 'Internal error');
    }
  }
}

/**
 * Handle WebSocket disconnection
 */
export function handleDisconnection(ws: ServerWebSocket<any>): void {
  const user = presenceService.getUserByWs(ws);
  
  if (user) {
    const { userId, chatRooms } = user;
    const chatIds = Array.from(chatRooms);

    // Remove from presence service (this also clears typing timers)
    presenceService.removeUser(ws);

    // Leave all chat rooms
    roomManager.leaveAllRooms(ws);

    // Broadcast offline status to all chat participants
    presenceService.broadcastPresence(userId, false, chatIds);

    logger.userDisconnected(userId);
  }
}

/**
 * Handle ping message (heartbeat)
 */
export function handlePing(ws: ServerWebSocket<any>): void {
  const pongPayload = {
    timestamp: new Date().toISOString(),
  };

  ws.send(JSON.stringify({
    type: 'pong',
    payload: pongPayload,
  }));

  logger.debug('Ping received, pong sent');
}
