import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BedrockAgentService } from './bedrock/bedrock-agent.service';
import { InMemoryConversationRepository } from './persistence/in-memory-conversation.repository';
import { AGENT_SERVICE } from '../domain/chat/services/agent.service.interface';
import { CONVERSATION_REPOSITORY } from '../domain/chat/repositories/conversation.repository.interface';
import awsConfig from './config/aws.config';
import appConfig from './config/app.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [awsConfig, appConfig],
      envFilePath: ['.env.local', '.env'],
    }),
  ],
  providers: [
    {
      provide: AGENT_SERVICE,
      useClass: BedrockAgentService,
    },
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: InMemoryConversationRepository,
    },
  ],
  exports: [AGENT_SERVICE, CONVERSATION_REPOSITORY],
})
export class InfrastructureModule {}
