import { Injectable, Logger } from '@nestjs/common';
import { IConversationRepository } from '../../domain/chat/repositories/conversation.repository.interface';
import { Conversation } from '../../domain/chat/entities/conversation.entity';
import { SessionId } from '../../domain/chat/value-objects/session-id.value-object';
import { UUID } from '../../domain/shared/value-objects/uuid.value-object';

@Injectable()
export class InMemoryConversationRepository implements IConversationRepository {
  private readonly logger = new Logger(InMemoryConversationRepository.name);
  private readonly conversations = new Map<string, Conversation>();

  async save(conversation: Conversation): Promise<void> {
    this.conversations.set(conversation.id.toString(), conversation);
    this.logger.debug(`Saved conversation: ${conversation.id.toString()}`);
  }

  async findById(id: UUID): Promise<Conversation | null> {
    const conversation = this.conversations.get(id.toString());
    return conversation || null;
  }

  async findBySessionId(sessionId: SessionId): Promise<Conversation | null> {
    for (const conversation of this.conversations.values()) {
      if (conversation.sessionId.equals(sessionId)) {
        return conversation;
      }
    }
    return null;
  }

  async delete(id: UUID): Promise<void> {
    this.conversations.delete(id.toString());
    this.logger.debug(`Deleted conversation: ${id.toString()}`);
  }
}
