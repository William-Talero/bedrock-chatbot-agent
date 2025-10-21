import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UsePipes, ValidationPipe } from '@nestjs/common';
import { SendMessageUseCase } from '../../application/chat/use-cases/send-message.use-case';
import { GetConversationUseCase } from '../../application/chat/use-cases/get-conversation.use-case';
import { EndConversationUseCase } from '../../application/chat/use-cases/end-conversation.use-case';
import { SendMessageDto } from '../../application/chat/dto/send-message.dto';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
    credentials: true,
  },
  path: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly sendMessageUseCase: SendMessageUseCase,
    private readonly getConversationUseCase: GetConversationUseCase,
    private readonly endConversationUseCase: EndConversationUseCase,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    client.emit('connected', { clientId: client.id });
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('sendMessage')
  @UsePipes(new ValidationPipe({ transform: true }))
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(
      `Received message from client ${client.id} for session ${dto.sessionId}`,
    );

    try {
      client.emit('messageReceived', { sessionId: dto.sessionId });

      for await (const chunk of this.sendMessageUseCase.execute(dto)) {
        client.emit('messageChunk', {
          sessionId: dto.sessionId,
          chunk,
        });
      }

      client.emit('messageComplete', { sessionId: dto.sessionId });
    } catch (error) {
      this.logger.error(
        `Error processing message for session ${dto.sessionId}:`,
        error,
      );
      client.emit('error', {
        sessionId: dto.sessionId,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('getConversation')
  async handleGetConversation(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(
      `Getting conversation for session ${data.sessionId} from client ${client.id}`,
    );

    try {
      const messages = await this.getConversationUseCase.execute(data.sessionId);
      client.emit('conversationHistory', {
        sessionId: data.sessionId,
        messages,
      });
    } catch (error) {
      this.logger.error(
        `Error getting conversation for session ${data.sessionId}:`,
        error,
      );
      client.emit('error', {
        sessionId: data.sessionId,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('endConversation')
  async handleEndConversation(
    @MessageBody() data: { sessionId: string },
    @ConnectedSocket() client: Socket,
  ): Promise<void> {
    this.logger.log(
      `Ending conversation for session ${data.sessionId} from client ${client.id}`,
    );

    try {
      await this.endConversationUseCase.execute(data.sessionId);
      client.emit('conversationEnded', {
        sessionId: data.sessionId,
      });
    } catch (error) {
      this.logger.error(
        `Error ending conversation for session ${data.sessionId}:`,
        error,
      );
      client.emit('error', {
        sessionId: data.sessionId,
        message: error.message,
      });
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket): void {
    client.emit('pong');
  }
}
