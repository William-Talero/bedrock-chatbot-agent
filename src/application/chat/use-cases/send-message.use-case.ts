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
import { MessageContent } from '../../../domain/chat/value-objects/message-content.value-object';
import { Message, MessageRole } from '../../../domain/chat/entities/message.entity';
import { Conversation } from '../../../domain/chat/entities/conversation.entity';
import { SendMessageDto } from '../dto/send-message.dto';
import { StreamChunkDto } from '../dto/message-response.dto';

@Injectable()
export class SendMessageUseCase {
  constructor(
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepository: IConversationRepository,
    @Inject(AGENT_SERVICE)
    private readonly agentService: IAgentService,
  ) {}

  async *execute(dto: SendMessageDto): AsyncGenerator<StreamChunkDto, void, unknown> {
    const sessionId = SessionId.create(dto.sessionId);
    const messageContent = MessageContent.create(dto.content);

    let conversation = await this.conversationRepository.findBySessionId(sessionId);
    if (!conversation) {
      conversation = Conversation.create(sessionId);
      await this.agentService.initializeSession(sessionId);
    }

    const userMessage = Message.create(
      sessionId,
      MessageRole.USER,
      messageContent,
      dto.metadata,
    );
    conversation.addMessage(userMessage);
    await this.conversationRepository.save(conversation);

    let fullResponse = '';
    try {
      for await (const chunk of this.agentService.sendMessage(
        sessionId,
        messageContent,
      )) {
        fullResponse += chunk.content;

        yield {
          content: chunk.content,
          isComplete: chunk.isComplete,
          metadata: chunk.metadata,
        };

        if (chunk.isComplete) {
          const assistantMessage = Message.create(
            sessionId,
            MessageRole.ASSISTANT,
            MessageContent.create(fullResponse),
            chunk.metadata,
          );
          conversation.addMessage(assistantMessage);
          await this.conversationRepository.save(conversation);
        }
      }
    } catch (error) {
      throw new Error(`Failed to send message: ${error.message}`);
    }
  }
}
