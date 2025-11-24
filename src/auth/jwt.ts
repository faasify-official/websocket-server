/**
 * Authentication via HTTP API
 */

import { config } from '../config/env.ts';
import { AuthenticationError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';

export interface UserProfile {
  userId: string;
  email: string;
  name: string;
  role: 'buyer' | 'seller';
  hasStorefront?: boolean;
}

/**
 * Verify token by calling HTTP API's /auth/profile endpoint
 * @param token - JWT token string
 * @returns User profile information
 * @throws AuthenticationError if token is invalid
 */
export async function verifyToken(token: string): Promise<UserProfile> {
  try {
    const response = await fetch(`${config.httpApiUrl}/auth/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      if (response.status === 401) {
        logger.authFailure('Invalid or expired token', { status: response.status });
        throw new AuthenticationError('Invalid or expired token');
      }
      
      if (response.status === 403) {
        logger.authFailure('Token forbidden', { status: response.status });
        throw new AuthenticationError('Access forbidden');
      }

      const errorText = await response.text();
      logger.authFailure('Auth API error', { status: response.status, error: errorText });
      throw new AuthenticationError(`Authentication failed: ${response.statusText}`);
    }

    const { user: profile } = (await response.json()) as { user :UserProfile };

    // Validate required fields
    if (!profile.userId || !profile.email || !profile.name) {
      logger.authFailure('Invalid profile response', { profile });
      throw new AuthenticationError('Invalid user profile');
    }

    logger.debug('Token verified successfully via HTTP API', { 
      userId: profile.userId,
      email: profile.email,
      role: profile.role 
    });

    return profile;
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    // Network or timeout errors
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Authentication request failed', error);
    throw new AuthenticationError(`Authentication failed: ${errorMessage}`);
  }
}

/**
 * Extract token from WebSocket URL or headers
 * @param url - WebSocket connection URL
 * @param headers - Connection headers
 * @returns JWT token string or null
 */
export function extractToken(url: string, headers: Headers): string | null {
  // Try query parameter first: ws://localhost:8080?token=<jwt>
  try {
    const urlObj = new URL(url);
    const tokenFromQuery = urlObj.searchParams.get('token');
    if (tokenFromQuery) {
      return tokenFromQuery;
    }
  } catch (error) {
    logger.debug('Failed to parse URL for token', { url });
  }

  // Try Authorization header: Authorization: Bearer <jwt>
  const authHeader = headers.get('authorization') || headers.get('Authorization');
  if (authHeader) {
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Authenticate WebSocket connection
 * @param url - WebSocket connection URL
 * @param headers - Connection headers
 * @returns User profile from HTTP API
 * @throws AuthenticationError if authentication fails
 */
export async function authenticateConnection(
  url: string,
  headers: Headers
): Promise<UserProfile> {
  const token = extractToken(url, headers);
  
  if (!token) {
    logger.authFailure('No token provided');
    throw new AuthenticationError('No authentication token provided');
  }

  return await verifyToken(token);
}
