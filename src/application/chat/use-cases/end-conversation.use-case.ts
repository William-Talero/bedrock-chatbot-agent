import { Inject, Injectable } from '@nestjs/common';
import {
  IConversationRepository,
  CONVERSATION_REPOSITORY,
} from '../../../domain/chat/repositories/conversation.repository.interface';
import {
  IAgentService,
  AGENT_SERVICE,
} from '../../../domain/chat/services/agent.service.interface';
import { SessionId } from '../../../domain/chat/value-objects/session-id.value-object';

@Injectable()
export class EndConversationUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    @Inject(AGENT_SERVICE)
    private readonly agentService: IAgentService,
  ) {}

  async execute(sessionIdString: string): Promise<void> {
    const sessionId = SessionId.create(sessionIdString);
    const conversation = await this.conversationRepository.findBySessionId(sessionId);

    if (!conversation) {
      throw new Error(`Conversation not found for session: ${sessionIdString}`);
    }

    conversation.end();
    await this.conversationRepository.save(conversation);
    await this.agentService.endSession(sessionId);
  }
}
