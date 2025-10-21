import { UUID } from '../../shared/value-objects/uuid.value-object';
import { Timestamp } from '../../shared/value-objects/timestamp.value-object';
import { SessionId } from '../value-objects/session-id.value-object';
import { Message } from './message.entity';

export interface ConversationProps {
  id: UUID;
  sessionId: SessionId;
  messages: Message[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
  isActive: boolean;
}

export class Conversation {
  private props: ConversationProps;
  private static readonly MAX_MESSAGES = 100;

  private constructor(props: ConversationProps) {
    this.props = props;
  }

  static create(sessionId: SessionId): Conversation {
    return new Conversation({
      id: UUID.create(),
      sessionId,
      messages: [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      isActive: true,
    });
  }

  static reconstitute(props: ConversationProps): Conversation {
    return new Conversation(props);
  }

  addMessage(message: Message): void {
    if (!this.props.isActive) {
      throw new Error('Cannot add message to inactive conversation');
    }

    if (!message.sessionId.equals(this.props.sessionId)) {
      throw new Error('Message session ID does not match conversation session ID');
    }

    if (this.props.messages.length >= Conversation.MAX_MESSAGES) {
      throw new Error(
        `Conversation has reached maximum of ${Conversation.MAX_MESSAGES} messages`,
      );
    }

    this.props.messages.push(message);
    this.props.updatedAt = Timestamp.now();
  }

  getMessages(): ReadonlyArray<Message> {
    return [...this.props.messages];
  }

  getLastMessage(): Message | undefined {
    return this.props.messages[this.props.messages.length - 1];
  }

  getMessageCount(): number {
    return this.props.messages.length;
  }

  end(): void {
    this.props.isActive = false;
    this.props.updatedAt = Timestamp.now();
  }

  get id(): UUID {
    return this.props.id;
  }

  get sessionId(): SessionId {
    return this.props.sessionId;
  }

  get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  get updatedAt(): Timestamp {
    return this.props.updatedAt;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  equals(other: Conversation): boolean {
    return this.props.id.equals(other.id);
  }
}
