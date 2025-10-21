import { registerAs } from '@nestjs/config';

export default registerAs('mcp', () => ({
  enabled: process.env.MCP_ENABLED === 'true',
  serverUrl: process.env.MCP_SERVER_URL || '',
  authToken: process.env.MCP_AUTH_TOKEN || '',
  timeout: parseInt(process.env.MCP_TIMEOUT || '30000', 10),
  retryAttempts: parseInt(process.env.MCP_RETRY_ATTEMPTS || '3', 10),
}));
