/**
 * WebSocket Server Entry Point
 * Real-time messaging server using Bun WebSockets
 */

import type { ServerWebSocket } from 'bun';
import { config } from './config/env.ts';
import { logger } from './utils/logger.ts';
import { presenceService } from './services/presence.ts';
import { roomManager } from './services/room-manager.ts';
import { handleConnection, handleDisconnection, handlePing } from './handlers/connection.ts';
import { handleChatMessage } from './handlers/message.ts';
import { handleChatRead } from './handlers/read.ts';
import { handleChatTyping } from './handlers/typing.ts';
import { WebSocketError } from './utils/errors.ts';
import type { WebSocketMessage, MessageTypes } from './types/websocket.ts';

/**
 * WebSocket data attached to each connection
 */
interface WebSocketData {
  initialized: boolean;
  connectionTime: number;
  request?: Request;
}


/**
 * Send error message to client
 */
function sendError(
  ws: ServerWebSocket<WebSocketData>,
  code: string,
  message: string,
  details?: any
): void {
  try {
    ws.send(JSON.stringify({
      type: 'error',
      payload: { code, message, details },
    }));
  } catch (error) {
    logger.error('Failed to send error message', error);
  }
}

/**
 * Handle incoming WebSocket messages
 */
async function handleMessage(
  ws: ServerWebSocket<WebSocketData>,
  message: string | Buffer
): Promise<void> {
  try {
    // Parse message - convert to string
    const messageStr = typeof message === 'string' 
      ? message 
      : message.toString('utf-8');
    
    if (messageStr.length > config.maxMessageSize) {
      sendError(ws, 'VALIDATION_ERROR', 'Message too large');
      return;
    }

    let parsedMessage: WebSocketMessage;
    try {
      parsedMessage = JSON.parse(messageStr);
    } catch (error) {
      sendError(ws, 'INVALID_MESSAGE', 'Invalid JSON format');
      return;
    }

    const { type, payload } = parsedMessage;

    if (!type || typeof type !== 'string') {
      sendError(ws, 'INVALID_MESSAGE', 'Missing or invalid message type');
      return;
    }

    logger.debug('Received message', { type });

    // Route message to appropriate handler
    switch (type) {
      case 'chat:message':
        await handleChatMessage(ws, payload);
        break;

      case 'chat:read':
        await handleChatRead(ws, payload);
        break;

      case 'chat:typing':
        handleChatTyping(ws, payload);
        break;

      case 'ping':
        handlePing(ws);
        break;

      default:
        sendError(ws, 'INVALID_MESSAGE', `Unknown message type: ${type}`);
        logger.warn('Unknown message type', { type });
    }
  } catch (error) {
    logger.error('Error handling message', error);

    if (error instanceof WebSocketError) {
      sendError(ws, error.code, error.message, error.details);
    } else {
      sendError(
        ws,
        'INTERNAL_ERROR',
        'An internal error occurred',
        process.env.NODE_ENV === 'development' ? { error: String(error) } : undefined
      );
    }
  }
}

/**
 * Graceful shutdown handler
 */
let isShuttingDown = false;

async function gracefulShutdown(signal: string): Promise<void> {
  if (isShuttingDown) {
    return;
  }
  
  isShuttingDown = true;
  logger.info(`Received ${signal}, starting graceful shutdown`);

  try {
    // Get all online users
    const users = presenceService.getOnlineUsers();
    
    // Notify all connected clients
    const shutdownMessage = JSON.stringify({
      type: 'error',
      payload: {
        code: 'SERVER_SHUTDOWN',
        message: 'Server is shutting down',
      },
    });

    for (const user of users) {
      try {
        user.ws.send(shutdownMessage);
        user.ws.close(1001, 'Server shutting down');
      } catch (error) {
        logger.error('Error closing WebSocket', error, { userId: user.userId });
      }
    }

    // Wait a bit for messages to be sent
    await new Promise(resolve => setTimeout(resolve, 1000));

    logger.info('Graceful shutdown complete');
    process.exit(0);
  } catch (error) {
    logger.error('Error during graceful shutdown', error);
    process.exit(1);
  }
}

// Register shutdown handlers
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

/**
 * Start WebSocket server
 */
const server = Bun.serve({
  port: config.wsPort,
  
  async fetch(req, server) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': config.corsOrigin,
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        },
      });
    }

    // Upgrade to WebSocket
    const upgraded = server.upgrade(req, {
      data: {
        initialized: false,
        connectionTime: Date.now(),
        request: req.clone() as Request,
      },
    });

    if (!upgraded) {
      return new Response('WebSocket upgrade failed', { status: 400 });
    }

    return undefined;
  },

  websocket: {
    data: {} as WebSocketData,

    /**
     * Connection opened
     */
    async open(ws) {
      logger.debug('WebSocket connection opened');
      
      // Authenticate the connection
      if (ws.data.request) {
        try {
          await handleConnection(ws, ws.data.request);
          ws.data.initialized = true;
        } catch (error) {
          logger.error('Failed to authenticate connection', error);
          // Connection will be closed by handleConnection if auth fails
        }
      }
    },

    /**
     * Message received
     */
    async message(ws, message) {
      // Check if connection is authenticated
      if (!ws.data.initialized) {
        sendError(ws, 'AUTH_FAILED', 'Connection not authenticated');
        ws.close(4001, 'Not authenticated');
        return;
      }

      await handleMessage(ws, message);
    },

    /**
     * Connection closed
     */
    close(ws) {
      logger.debug('WebSocket connection closed');
      handleDisconnection(ws);
    },
  },
});

// Log server startup
logger.info('WebSocket server started', {
  port: config.wsPort,
  httpApiUrl: config.httpApiUrl,
  corsOrigin: config.corsOrigin,
});

// Log statistics periodically
setInterval(() => {
  const presenceStats = presenceService.getStats();
  const roomStats = roomManager.getStats();
  
  logger.info('Server statistics', {
    ...presenceStats,
    ...roomStats,
  });
}, 60000); // Every minute

console.log(`✅ WebSocket server running on ws://localhost:${config.wsPort}`);
