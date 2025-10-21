export class MessageResponseDto {
  id: string;
  sessionId: string;
  role: string;
  content: string;
  createdAt: string;
  metadata?: Record<string, any>;
}

export class StreamChunkDto {
  content: string;
  isComplete: boolean;
  metadata?: Record<string, any>;
}
