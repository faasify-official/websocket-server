# WebSocket Server Testing Guide

This document provides examples and test cases for the WebSocket server.

## Quick Start Test

### 1. Start the Server
```bash
bun run dev
```

You should see:
```
✅ WebSocket server running on ws://localhost:8080
```

### 2. Test with Browser Console

Open your browser console and paste:

```javascript
// Connect to WebSocket server
const token = 'YOUR_JWT_TOKEN_HERE'; // Replace with actual token
const ws = new WebSocket(`ws://localhost:8080?token=${token}`);

// Connection handlers
ws.onopen = () => {
  console.log('✅ Connected to WebSocket server');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('📨 Received:', data);
};

ws.onerror = (error) => {
  console.error('❌ Error:', error);
};

ws.onclose = (event) => {
  console.log('🔌 Disconnected:', event.code, event.reason);
};

// Send a test message after connection
ws.onopen = () => {
  console.log('✅ Connected');
  
  // Send ping
  ws.send(JSON.stringify({
    type: 'ping',
    payload: {}
  }));
};
```

## Message Examples

### Send a Chat Message
```javascript
ws.send(JSON.stringify({
  type: 'chat:message',
  payload: {
    chatId: 'your-chat-uuid',
    content: 'Hello, World!'
  }
}));
```

### Mark Message as Read
```javascript
ws.send(JSON.stringify({
  type: 'chat:read',
  payload: {
    chatId: 'your-chat-uuid',
    messageId: 'message-uuid'
  }
}));
```

### Send Typing Indicator
```javascript
// Start typing
ws.send(JSON.stringify({
  type: 'chat:typing',
  payload: {
    chatId: 'your-chat-uuid',
    isTyping: true
  }
}));

// Stop typing (after user stops)
ws.send(JSON.stringify({
  type: 'chat:typing',
  payload: {
    chatId: 'your-chat-uuid',
    isTyping: false
  }
}));
```

### Heartbeat (Ping/Pong)
```javascript
ws.send(JSON.stringify({
  type: 'ping',
  payload: {}
}));

// Server will respond with:
// { type: 'pong', payload: { timestamp: '2024-01-01T12:00:00.000Z' } }
```

## Expected Server Responses

### Connection Success
```json
{
  "type": "connected",
  "payload": {
    "userId": "user-uuid",
    "chatIds": ["chat-1", "chat-2"]
  }
}
```

### Incoming Message
```json
{
  "type": "chat:message",
  "payload": {
    "chatId": "chat-uuid",
    "message": {
      "id": "msg-uuid",
      "chatId": "chat-uuid",
      "senderId": "sender-uuid",
      "senderName": "John Doe",
      "content": "Hello!",
      "createdAt": "2024-01-01T12:00:00.000Z"
    }
  }
}
```

### Read Receipt
```json
{
  "type": "chat:read",
  "payload": {
    "chatId": "chat-uuid",
    "messageId": "msg-uuid",
    "userId": "reader-uuid",
    "readAt": "2024-01-01T12:01:00.000Z"
  }
}
```

### User Typing
```json
{
  "type": "chat:typing",
  "payload": {
    "chatId": "chat-uuid",
    "userId": "typer-uuid",
    "userName": "Jane Smith",
    "isTyping": true
  }
}
```

### User Online Status
```json
{
  "type": "user:online",
  "payload": {
    "userId": "user-uuid",
    "online": true
  }
}
```

### Error Response
```json
{
  "type": "error",
  "payload": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid chatId",
    "details": {}
  }
}
```

## Testing Scenarios

### Test 1: Authentication
**Valid Token**:
- Connect with valid JWT token
- Should receive "connected" message
- Should join all user's chat rooms

**Invalid Token**:
- Connect with invalid/expired token
- Should receive "error" with code "AUTH_FAILED"
- Connection should close with code 4001

### Test 2: Sending Messages
1. Connect two users to same chat
2. User A sends message
3. User B should receive the message
4. User A should NOT receive their own message (echo prevention)

### Test 3: Read Receipts
1. User A sends message
2. User B receives message
3. User B marks message as read
4. User A receives read receipt

### Test 4: Typing Indicators
1. User A starts typing (isTyping: true)
2. User B receives typing indicator
3. After 3 seconds, User B receives auto-stop (isTyping: false)
4. User A can manually stop (isTyping: false)

### Test 5: Presence
1. User A connects → All chat participants receive online=true
2. User A disconnects → All chat participants receive online=false

### Test 6: Multiple Chats
1. User is in Chat A and Chat B
2. Send message to Chat A
3. Only Chat A participants receive it
4. Chat B participants don't receive it

### Test 7: Error Handling
1. Send malformed JSON → Receive INVALID_MESSAGE error
2. Send unknown message type → Receive INVALID_MESSAGE error
3. Try to send to chat user is not in → Receive NOT_PARTICIPANT error
4. Send message too large → Receive VALIDATION_ERROR

## Node.js Test Script

Create `test.js`:

```javascript
const WebSocket = require('ws');

const token = 'YOUR_JWT_TOKEN';
const ws = new WebSocket(`ws://localhost:8080?token=${token}`);

ws.on('open', () => {
  console.log('✅ Connected');
  
  // Send ping
  ws.send(JSON.stringify({ type: 'ping', payload: {} }));
});

ws.on('message', (data) => {
  const message = JSON.parse(data);
  console.log('📨 Received:', JSON.stringify(message, null, 2));
  
  if (message.type === 'connected') {
    console.log(`👤 User ID: ${message.payload.userId}`);
    console.log(`💬 Chats: ${message.payload.chatIds.length}`);
  }
});

ws.on('error', (error) => {
  console.error('❌ Error:', error.message);
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Disconnected: ${code} - ${reason}`);
});
```

Run: `node test.js`

## Performance Testing

### Load Test with k6 (install from k6.io)

Create `load-test.js`:

```javascript
import ws from 'k6/ws';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  const token = 'YOUR_JWT_TOKEN';
  const url = `ws://localhost:8080?token=${token}`;

  const response = ws.connect(url, {}, function (socket) {
    socket.on('open', () => {
      // Send ping every 5 seconds
      socket.setInterval(() => {
        socket.send(JSON.stringify({ type: 'ping', payload: {} }));
      }, 5000);
    });

    socket.on('message', (data) => {
      check(data, { 'message received': (r) => r.length > 0 });
    });

    socket.setTimeout(() => {
      socket.close();
    }, 60000); // Close after 60 seconds
  });
}
```

Run: `k6 run load-test.js`

## Monitoring

### View Logs
```bash
bun run dev | bunyan  # If you have bunyan installed
```

Or with jq for pretty JSON:
```bash
bun run dev 2>&1 | jq
```

### Statistics
The server logs statistics every minute:
- Online users count
- Total chat subscriptions
- Average chats per user
- Total rooms
- Room sizes

## Common Issues

### Issue: "Missing required environment variable: COGNITO_USER_POOL_ID"
**Solution**: Copy `.env.example` to `.env` and update `COGNITO_USER_POOL_ID`

### Issue: Connection closes immediately with code 4001
**Solution**: JWT token is invalid or expired. Get a fresh token from Cognito.

### Issue: Messages not received by other users
**Solution**: 
- Check both users are in the same chat
- Verify HTTP API is running
- Check server logs for errors

### Issue: "Failed to verify token signature"
**Solution**: 
- Ensure `COGNITO_USER_POOL_ID` matches the token issuer
- Verify `COGNITO_REGION` is correct
- Check internet connection (server fetches public keys from AWS)

## Integration with Frontend

### React Example

```typescript
import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  token: string;
  onMessage?: (message: any) => void;
}

export function useWebSocket({ token, onMessage }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket(`ws://localhost:8080?token=${token}`);
    
    ws.onopen = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      onMessage?.(data);
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
    };
    
    wsRef.current = ws;
    
    return () => {
      ws.close();
    };
  }, [token]);

  const sendMessage = (type: string, payload: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, payload }));
    }
  };

  return { isConnected, sendMessage };
}
```

## Next Steps

1. ✅ Configure your `.env` file with real Cognito credentials
2. ✅ Start the HTTP REST API on port 3000
3. ✅ Start the WebSocket server: `bun run dev`
4. ✅ Test with browser console or test script
5. ✅ Integrate with your frontend application
6. 🚀 Deploy to production (consider using PM2 or Docker)

## Production Deployment

### Using PM2
```bash
bun build src/index.ts --outdir ./dist --target bun
pm2 start dist/index.js --name websocket-server
```

### Using Docker
Create `Dockerfile`:
```dockerfile
FROM oven/bun:1

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

EXPOSE 8080

CMD ["bun", "run", "src/index.ts"]
```

Build and run:
```bash
docker build -t websocket-server .
docker run -p 8080:8080 --env-file .env websocket-server
```

---

Happy testing! 🚀
