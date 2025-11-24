/**
 * Environment configuration
 */

export interface Config {
  // Server Configuration
  wsPort: number;
  httpApiUrl: string;
  corsOrigin: string;

  // Connection Settings
  heartbeatInterval: number;
  typingTimeout: number;
  maxMessageSize: number;
  connectionTimeout: number;

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] || defaultValue;
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvNumber(key: string, defaultValue: number): number {
  const value = process.env[key];
  return value ? parseInt(value, 10) : defaultValue;
}

export const config: Config = {
  // Server Configuration
  wsPort: getEnvNumber('WS_PORT', 8080),
  httpApiUrl: getEnv('HTTP_API_URL', 'http://localhost:3000'),
  corsOrigin: getEnv('CORS_ORIGIN', 'http://localhost:5173'),

  // Connection Settings
  heartbeatInterval: getEnvNumber('HEARTBEAT_INTERVAL', 30000),
  typingTimeout: getEnvNumber('TYPING_TIMEOUT', 3000),
  maxMessageSize: getEnvNumber('MAX_MESSAGE_SIZE', 10000),
  connectionTimeout: getEnvNumber('CONNECTION_TIMEOUT', 60000),

  // Logging
  logLevel: (getEnv('LOG_LEVEL', 'info') as Config['logLevel']),
};
