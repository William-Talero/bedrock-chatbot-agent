import { UUID } from '../../shared/value-objects/uuid.value-object';
import { Timestamp } from '../../shared/value-objects/timestamp.value-object';
import { MessageContent } from '../value-objects/message-content.value-object';
import { SessionId } from '../value-objects/session-id.value-object';

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant',
  SYSTEM = 'system',
}

export interface MessageProps {
  id: UUID;
  sessionId: SessionId;
  role: MessageRole;
  content: MessageContent;
  createdAt: Timestamp;
  metadata?: Record<string, any>;
}

export class Message {
  private props: MessageProps;

  private constructor(props: MessageProps) {
    this.props = props;
  }

  static create(
    sessionId: SessionId,
    role: MessageRole,
    content: MessageContent,
    metadata?: Record<string, any>,
  ): Message {
    return new Message({
      id: UUID.create(),
      sessionId,
      role,
      content,
      createdAt: Timestamp.now(),
      metadata,
    });
  }

  static reconstitute(props: MessageProps): Message {
    return new Message(props);
  }

  get id(): UUID {
    return this.props.id;
  }

  get sessionId(): SessionId {
    return this.props.sessionId;
  }

  get role(): MessageRole {
    return this.props.role;
  }

  get content(): MessageContent {
    return this.props.content;
  }

  get createdAt(): Timestamp {
    return this.props.createdAt;
  }

  get metadata(): Record<string, any> | undefined {
    return this.props.metadata;
  }

  isFromUser(): boolean {
    return this.props.role === MessageRole.USER;
  }

  isFromAssistant(): boolean {
    return this.props.role === MessageRole.ASSISTANT;
  }

  equals(other: Message): boolean {
    return this.props.id.equals(other.id);
  }
}
