import { Conversation } from '../entities/conversation.entity';
import { SessionId } from '../value-objects/session-id.value-object';
import { UUID } from '../../shared/value-objects/uuid.value-object';

export interface IConversationRepository {
  save(conversation: Conversation): Promise<void>;
  findById(id: UUID): Promise<Conversation | null>;
  findBySessionId(sessionId: SessionId): Promise<Conversation | null>;
  delete(id: UUID): Promise<void>;
}

export const CONVERSATION_REPOSITORY = Symbol('IConversationRepository');
