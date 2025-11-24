/**
 * User types and authentication
 */

export interface User {
  userId: string;        // Cognito sub (PK)
  email: string;
  name: string;
  role: 'buyer' | 'seller';
  hasStorefront: boolean;
  createdAt: string;     // ISO-8601
}

export interface CognitoToken {
  sub: string;              // Cognito UUID (used as userId)
  email: string;
  name: string;
  'custom:role': 'buyer' | 'seller';
  exp: number;             // Expiration timestamp
  iat: number;             // Issued at timestamp
  token_use?: string;      // 'id' for ID token
  aud?: string;            // Audience (client ID)
  iss?: string;            // Issuer
}

export interface ConnectedUser {
  userId: string;
  userName: string;
  email: string;
  role: 'buyer' | 'seller';
  ws: any;                 // WebSocket instance
  token: string;           // JWT token for HTTP API calls
  chatRooms: Set<string>;  // chatIds user is subscribed to
  connectedAt: Date;
  typingTimers: Map<string, NodeJS.Timeout>; // chatId -> timeout for typing indicators
}

export interface AuthenticatedWebSocketData {
  userId: string;
  token: string;
}
