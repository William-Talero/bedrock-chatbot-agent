import { Module } from '@nestjs/common';
import { InfrastructureModule } from '../infrastructure/infrastructure.module';
import { SendMessageUseCase } from './chat/use-cases/send-message.use-case';
import { GetConversationUseCase } from './chat/use-cases/get-conversation.use-case';
import { EndConversationUseCase } from './chat/use-cases/end-conversation.use-case';

@Module({
  imports: [InfrastructureModule],
  providers: [SendMessageUseCase, GetConversationUseCase, EndConversationUseCase],
  exports: [SendMessageUseCase, GetConversationUseCase, EndConversationUseCase],
})
export class ApplicationModule {}
