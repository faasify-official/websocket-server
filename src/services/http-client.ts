/**
 * HTTP client for REST API integration
 */

import { config } from '../config/env.ts';
import { HttpError } from '../utils/errors.ts';
import { logger } from '../utils/logger.ts';
import type { 
  ChatsResponse, 
  ChatResponse, 
  MessagesResponse, 
  CreateMessageRequest, 
  CreateMessageResponse 
} from '../types/chat.ts';

interface HttpOptions {
  method: string;
  headers: Record<string, string>;
  body?: string;
  timeout?: number;
}

/**
 * Make HTTP request with retry logic
 */
async function makeRequest<T>(
  endpoint: string,
  options: HttpOptions,
  retries = 3
): Promise<T> {
  const url = `${config.httpApiUrl}${endpoint}`;
  const startTime = Date.now();
  
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), options.timeout || 10000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      const duration = Date.now() - startTime;
      logger.httpRequest(options.method, endpoint, response.status, duration);
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new HttpError(
          `HTTP ${response.status}: ${errorData.message || response.statusText}`,
          response.status,
          errorData
        );
      }
      
      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on 4xx errors
      if (error instanceof HttpError && error.statusCode && error.statusCode < 500) {
        throw error;
      }
      
      // Don't retry if we're out of retries
      if (attempt === retries - 1) {
        break;
      }
      
      // Exponential backoff
      const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
      logger.warn(`Request failed, retrying in ${delay}ms`, { 
        endpoint, 
        attempt: attempt + 1, 
        error: lastError.message 
      });
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // All retries failed
  const duration = Date.now() - startTime;
  logger.error('HTTP request failed after all retries', lastError, { endpoint, duration });
  throw new HttpError('Request failed after retries', undefined, { originalError: lastError?.message });
}

/**
 * HTTP API Client
 */
export class HttpClient {
  /**
   * Get all chats for a user
   */
  async getChats(token: string): Promise<ChatsResponse> {
    return makeRequest<ChatsResponse>('/chats', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get a specific chat
   */
  async getChat(chatId: string, token: string): Promise<ChatResponse> {
    return makeRequest<ChatResponse>(`/chats/${chatId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get messages for a chat
   */
  async getMessages(chatId: string, token: string, nextToken?: string): Promise<MessagesResponse> {
    const params = nextToken ? `?nextToken=${encodeURIComponent(nextToken)}` : '';
    return makeRequest<MessagesResponse>(`/chats/${chatId}/messages${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send a message to a chat
   */
  async sendMessage(
    chatId: string, 
    content: string, 
    token: string
  ): Promise<CreateMessageResponse> {
    const body: CreateMessageRequest = { content };
    
    return makeRequest<CreateMessageResponse>(`/chats/${chatId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  /**
   * Mark a message as read
   */
  async markMessageAsRead(
    chatId: string, 
    messageId: string, 
    token: string
  ): Promise<void> {
    await makeRequest<void>(`/chats/${chatId}/messages/${messageId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Mark all messages in a chat as read
   */
  async markAllMessagesAsRead(chatId: string, token: string): Promise<void> {
    await makeRequest<void>(`/chats/${chatId}/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Validate that a user is a participant in a chat
   */
  async validateChatParticipant(chatId: string, token: string): Promise<boolean> {
    try {
      const response = await this.getChat(chatId, token);
      return response.chat != null;
    } catch (error) {
      if (error instanceof HttpError && error.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }
}

// Export singleton instance
export const httpClient = new HttpClient();
