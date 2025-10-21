import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { ChatGateway } from './chat/chat.gateway';

@Module({
  imports: [ApplicationModule],
  providers: [ChatGateway],
})
export class PresentationModule {}
