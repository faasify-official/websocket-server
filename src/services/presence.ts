/**
 * Presence tracking for online/offline status
 */

import { logger } from '../utils/logger.ts';
import { roomManager } from './room-manager.ts';
import type { ConnectedUser } from '../types/user.ts';
import type { ServerWebSocket } from 'bun';
import type { UserOnlinePayload } from '../types/websocket.ts';

/**
 * Presence service for tracking online users
 */
class PresenceService {
  // Map: userId -> ConnectedUser
  private connectedUsers = new Map<string, ConnectedUser>();
  
  // Map: WebSocket -> userId (for quick lookups)
  private wsToUserId = new Map<ServerWebSocket<any>, string>();

  /**
   * Register a user as online
   */
  addUser(user: ConnectedUser): void {
    this.connectedUsers.set(user.userId, user);
    this.wsToUserId.set(user.ws, user.userId);
    
    logger.debug('User added to presence', { 
      userId: user.userId, 
      chatRooms: user.chatRooms.size 
    });
  }

  /**
   * Remove a user (on disconnect)
   */
  removeUser(ws: ServerWebSocket<any>): ConnectedUser | undefined {
    const userId = this.wsToUserId.get(ws);
    if (!userId) {
      return undefined;
    }

    const user = this.connectedUsers.get(userId);
    if (user) {
      // Clear typing timers
      for (const timer of user.typingTimers.values()) {
        clearTimeout(timer);
      }
      
      this.connectedUsers.delete(userId);
      this.wsToUserId.delete(ws);
      
      logger.debug('User removed from presence', { userId });
    }

    return user;
  }

  /**
   * Get user by WebSocket
   */
  getUserByWs(ws: ServerWebSocket<any>): ConnectedUser | undefined {
    const userId = this.wsToUserId.get(ws);
    return userId ? this.connectedUsers.get(userId) : undefined;
  }

  /**
   * Get user by userId
   */
  getUser(userId: string): ConnectedUser | undefined {
    return this.connectedUsers.get(userId);
  }

  /**
   * Check if user is online
   */
  isUserOnline(userId: string): boolean {
    return this.connectedUsers.has(userId);
  }

  /**
   * Get all online users
   */
  getOnlineUsers(): ConnectedUser[] {
    return Array.from(this.connectedUsers.values());
  }

  /**
   * Get count of online users
   */
  getOnlineCount(): number {
    return this.connectedUsers.size;
  }

  /**
   * Broadcast online status to all participants in user's chats
   */
  broadcastPresence(userId: string, online: boolean, chatIds: string[]): void {
    const message: UserOnlinePayload = {
      userId,
      online,
    };

    const messageStr = JSON.stringify({
      type: 'user:online',
      payload: message,
    });

    // Broadcast to all chat rooms the user is part of
    const broadcastedRooms = new Set<string>();
    
    for (const chatId of chatIds) {
      if (!broadcastedRooms.has(chatId)) {
        roomManager.broadcastToRoom(chatId, messageStr);
        broadcastedRooms.add(chatId);
      }
    }

    logger.debug('Broadcast user presence', { 
      userId, 
      online, 
      chatCount: chatIds.length 
    });
  }

  /**
   * Get participants in a chat who are currently online
   */
  getOnlineParticipants(chatId: string, participantIds: string[]): string[] {
    return participantIds.filter(userId => this.isUserOnline(userId));
  }

  /**
   * Add typing timer for a user in a chat
   */
  setTypingTimer(userId: string, chatId: string, timer: NodeJS.Timeout): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      // Clear existing timer for this chat
      const existingTimer = user.typingTimers.get(chatId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      user.typingTimers.set(chatId, timer);
    }
  }

  /**
   * Clear typing timer for a user in a chat
   */
  clearTypingTimer(userId: string, chatId: string): void {
    const user = this.connectedUsers.get(userId);
    if (user) {
      const timer = user.typingTimers.get(chatId);
      if (timer) {
        clearTimeout(timer);
        user.typingTimers.delete(chatId);
      }
    }
  }

  /**
   * Get statistics
   */
  getStats() {
    const userChatCounts = Array.from(this.connectedUsers.values()).map(
      user => user.chatRooms.size
    );
    
    return {
      onlineUsers: this.connectedUsers.size,
      totalChatSubscriptions: userChatCounts.reduce((sum, count) => sum + count, 0),
      avgChatsPerUser: userChatCounts.length > 0 
        ? userChatCounts.reduce((sum, count) => sum + count, 0) / userChatCounts.length 
        : 0,
    };
  }
}

// Export singleton instance
export const presenceService = new PresenceService();
