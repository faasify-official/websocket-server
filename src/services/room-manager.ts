/**
 * Room management for WebSocket chat rooms
 */

import { logger } from '../utils/logger.ts';
import type { ServerWebSocket } from 'bun';

export interface RoomManager {
  joinRoom(chatId: string, ws: ServerWebSocket<any>): void;
  leaveRoom(chatId: string, ws: ServerWebSocket<any>): void;
  leaveAllRooms(ws: ServerWebSocket<any>): void;
  broadcastToRoom(chatId: string, message: string, excludeWs?: ServerWebSocket<any>): void;
  getRoomParticipants(chatId: string): ServerWebSocket<any>[];
  getRoomCount(chatId: string): number;
}

/**
 * Room manager implementation using Map
 */
class RoomManagerImpl implements RoomManager {
  // Map: chatId -> Set of WebSocket connections
  private rooms = new Map<string, Set<ServerWebSocket<any>>>();
  
  // Map: WebSocket -> Set of chatIds (for cleanup)
  private wsRooms = new Map<ServerWebSocket<any>, Set<string>>();

  /**
   * Add a WebSocket to a chat room
   */
  joinRoom(chatId: string, ws: ServerWebSocket<any>): void {
    // Add to room
    if (!this.rooms.has(chatId)) {
      this.rooms.set(chatId, new Set());
    }
    this.rooms.get(chatId)!.add(ws);

    // Track rooms for this WebSocket
    if (!this.wsRooms.has(ws)) {
      this.wsRooms.set(ws, new Set());
    }
    this.wsRooms.get(ws)!.add(chatId);

    logger.debug('User joined room', { chatId, roomSize: this.rooms.get(chatId)!.size });
  }

  /**
   * Remove a WebSocket from a chat room
   */
  leaveRoom(chatId: string, ws: ServerWebSocket<any>): void {
    const room = this.rooms.get(chatId);
    if (room) {
      room.delete(ws);
      if (room.size === 0) {
        this.rooms.delete(chatId);
      }
    }

    const wsRoomSet = this.wsRooms.get(ws);
    if (wsRoomSet) {
      wsRoomSet.delete(chatId);
      if (wsRoomSet.size === 0) {
        this.wsRooms.delete(ws);
      }
    }

    logger.debug('User left room', { chatId });
  }

  /**
   * Remove a WebSocket from all rooms (on disconnect)
   */
  leaveAllRooms(ws: ServerWebSocket<any>): void {
    const wsRoomSet = this.wsRooms.get(ws);
    if (wsRoomSet) {
      for (const chatId of wsRoomSet) {
        const room = this.rooms.get(chatId);
        if (room) {
          room.delete(ws);
          if (room.size === 0) {
            this.rooms.delete(chatId);
          }
        }
      }
      this.wsRooms.delete(ws);
    }
  }

  /**
   * Broadcast a message to all participants in a room
   */
  broadcastToRoom(
    chatId: string, 
    message: string, 
    excludeWs?: ServerWebSocket<any>
  ): void {
    const room = this.rooms.get(chatId);
    if (!room) {
      logger.debug('Attempted to broadcast to non-existent room', { chatId });
      return;
    }

    let sentCount = 0;
    for (const ws of room) {
      if (excludeWs && ws === excludeWs) {
        continue;
      }
      
      try {
        ws.send(message);
        sentCount++;
      } catch (error) {
        logger.error('Failed to send message to WebSocket', error, { chatId });
      }
    }

    logger.debug('Broadcast message to room', { 
      chatId, 
      recipients: sentCount, 
      totalInRoom: room.size,
      excluded: excludeWs ? 1 : 0
    });
  }

  /**
   * Get all WebSocket connections in a room
   */
  getRoomParticipants(chatId: string): ServerWebSocket<any>[] {
    const room = this.rooms.get(chatId);
    return room ? Array.from(room) : [];
  }

  /**
   * Get the number of participants in a room
   */
  getRoomCount(chatId: string): number {
    const room = this.rooms.get(chatId);
    return room ? room.size : 0;
  }

  /**
   * Get all rooms for debugging
   */
  getAllRooms(): Map<string, number> {
    const roomSizes = new Map<string, number>();
    for (const [chatId, room] of this.rooms) {
      roomSizes.set(chatId, room.size);
    }
    return roomSizes;
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      totalRooms: this.rooms.size,
      totalConnections: this.wsRooms.size,
      roomSizes: this.getAllRooms(),
    };
  }
}

// Export singleton instance
export const roomManager = new RoomManagerImpl();
