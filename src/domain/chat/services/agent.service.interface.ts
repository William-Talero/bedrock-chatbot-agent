import { SessionId } from '../value-objects/session-id.value-object';
import { MessageContent } from '../value-objects/message-content.value-object';

export interface AgentResponse {
  content: string;
  metadata?: Record<string, any>;
}

export interface StreamChunk {
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}

export interface IAgentService {
  sendMessage(
    sessionId: SessionId,
    message: MessageContent,
  ): AsyncGenerator<StreamChunk, void, unknown>;

  initializeSession(sessionId: SessionId): Promise<void>;

  endSession(sessionId: SessionId): Promise<void>;
}

export const AGENT_SERVICE = Symbol('IAgentService');
