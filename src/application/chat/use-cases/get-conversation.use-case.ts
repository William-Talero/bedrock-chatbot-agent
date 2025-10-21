import { Inject, Injectable } from '@nestjs/common';
import {
  IConversationRepository,
  CONVERSATION_REPOSITORY,
} from '../../../domain/chat/repositories/conversation.repository.interface';
import { SessionId } from '../../../domain/chat/value-objects/session-id.value-object';
import { MessageResponseDto } from '../dto/message-response.dto';

@Injectable()
export class GetConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
  ) {}

  async execute(sessionIdString: string): Promise<MessageResponseDto[]> {
    const sessionId = SessionId.create(sessionIdString);
    const conversation = await this.conversationRepository.findBySessionId(sessionId);

    if (!conversation) {
      return [];
    }

    return conversation.getMessages().map((message) => ({
      id: message.id.toString(),
      sessionId: message.sessionId.toString(),
      role: message.role,
      content: message.content.toString(),
      createdAt: message.createdAt.toISOString(),
      metadata: message.metadata,
    }));
  }
}
