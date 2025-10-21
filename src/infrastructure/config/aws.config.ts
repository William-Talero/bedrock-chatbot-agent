import { registerAs } from '@nestjs/config';

export default registerAs('aws', () => ({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  bedrock: {
    agentId: process.env.BEDROCK_AGENT_ID,
    agentAliasId: process.env.BEDROCK_AGENT_ALIAS_ID,
  },
}));
