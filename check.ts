#!/usr/bin/env bun
/**
 * Development helper script
 * Quick health checks and utilities for development
 */

import { existsSync } from 'fs';

console.log('🔍 WebSocket Server Health Check\n');

// Check environment variables
console.log('📋 Environment Configuration:');
console.log('  WS_PORT:', process.env.WS_PORT || '❌ Not set (default: 8080)');
console.log('  HTTP_API_URL:', process.env.HTTP_API_URL || '❌ Not set (default: http://localhost:3000)');
console.log('  CORS_ORIGIN:', process.env.CORS_ORIGIN || '❌ Not set (default: http://localhost:5173)');
console.log('  LOG_LEVEL:', process.env.LOG_LEVEL || '❌ Not set (default: info)');
console.log();

// Check HTTP API
console.log('🌐 Checking HTTP API connection...');
const httpApiUrl = process.env.HTTP_API_URL || 'http://localhost:3000';

try {
  const response = await fetch(`${httpApiUrl}/health`, { 
    method: 'GET',
    signal: AbortSignal.timeout(5000)
  }).catch(() => null);
  
  if (response && response.ok) {
    console.log(`  ✅ HTTP API is reachable at ${httpApiUrl}`);
  } else if (response) {
    console.log(`  ⚠️  HTTP API responded with status ${response.status}`);
  } else {
    console.log(`  ❌ HTTP API is not reachable at ${httpApiUrl}`);
    console.log('     Make sure your HTTP REST API is running');
  }
} catch (error) {
  console.log(`  ❌ Could not connect to HTTP API at ${httpApiUrl}`);
  console.log('     Make sure your HTTP REST API is running');
}
console.log();

// Check project structure
console.log('📁 Project Structure:');

const requiredFiles = [
  'src/index.ts',
  'src/auth/jwt.ts',
  'src/handlers/connection.ts',
  'src/handlers/message.ts',
  'src/handlers/read.ts',
  'src/handlers/typing.ts',
  'src/services/http-client.ts',
  'src/services/presence.ts',
  'src/services/room-manager.ts',
  'src/types/websocket.ts',
  'src/types/chat.ts',
  'src/types/user.ts',
  'src/utils/logger.ts',
  'src/utils/errors.ts',
  'src/config/env.ts',
];

let allFilesPresent = true;
for (const file of requiredFiles) {
  const exists = existsSync(file);
  console.log(`  ${exists ? '✅' : '❌'} ${file}`);
  if (!exists) allFilesPresent = false;
}
console.log();

if (!allFilesPresent) {
  console.log('❌ Some required files are missing!');
  process.exit(1);
}

// Summary
console.log('📊 Summary:');
console.log(`  Project structure: ${allFilesPresent ? '✅ Complete' : '❌ Incomplete'}`);
console.log(`  HTTP API: ${httpApiUrl}`);
console.log();

console.log('✅ Ready to start! Run: bun run dev');
console.log('   Make sure your HTTP API is running on:', httpApiUrl);
console.log();
