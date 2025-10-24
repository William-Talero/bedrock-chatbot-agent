import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BedrockAgentRuntimeClient,
  InvokeAgentCommand,
  ThrottlingException,
} from '@aws-sdk/client-bedrock-agent-runtime';
import { IAgentService, StreamChunk } from '../../domain/chat/services/agent.service.interface';
import { SessionId } from '../../domain/chat/value-objects/session-id.value-object';
import { MessageContent } from '../../domain/chat/value-objects/message-content.value-object';

@Injectable()
export class BedrockAgentService implements IAgentService {
  private readonly logger = new Logger(BedrockAgentService.name);
  private readonly client: BedrockAgentRuntimeClient;
  private readonly agentId: string;
  private readonly agentAliasId: string;
  private lastRequestTime: number = 0;
  private readonly minRequestInterval: number = 2000;

  constructor(private readonly configService: ConfigService) {
    const region = this.configService.get<string>('aws.region');
    const credentials = this.configService.get('aws.credentials');

    this.client = new BedrockAgentRuntimeClient({
      region,
      credentials,
    });

    this.agentId = this.configService.get<string>('aws.bedrock.agentId') || '';
    this.agentAliasId = this.configService.get<string>('aws.bedrock.agentAliasId') || '';

    this.logger.log(
      `BedrockAgentService initialized with region: ${region}, agentId: ${this.agentId}`,
    );
  }

  private async waitForRateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.minRequestInterval) {
      const waitTime = this.minRequestInterval - timeSinceLastRequest;
      this.logger.debug(`Rate limiting: waiting ${waitTime}ms before next request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async sendCommandWithRetry(
    command: InvokeAgentCommand,
    maxRetries: number = 3,
  ): Promise<any> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        await this.waitForRateLimit();

        const response = await this.client.send(command);
        return response;
      } catch (error) {
        const isThrottling = error.name === 'ThrottlingException' ||
                            error.message?.includes('rate') ||
                            error.message?.includes('throttl');

        if (isThrottling && attempt < maxRetries - 1) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
          this.logger.warn(
            `Rate limit hit (attempt ${attempt + 1}/${maxRetries}), retrying in ${backoffTime}ms...`,
          );
          await this.sleep(backoffTime);
          continue;
        }

        throw error;
      }
    }
  }

  async *sendMessage(
    sessionId: SessionId,
    message: MessageContent,
  ): AsyncGenerator<StreamChunk, void, unknown> {
    this.logger.debug(`Sending message for session: ${sessionId.toString()}`);

    try {
      const command = new InvokeAgentCommand({
        agentId: this.agentId,
        agentAliasId: this.agentAliasId,
        sessionId: sessionId.toString(),
        inputText: message.toString(),
        enableTrace: true,
      });

      const response = await this.sendCommandWithRetry(command);

      if (!response.completion) {
        throw new Error('No completion stream returned from Bedrock Agent');
      }

      let fullContent = '';

      for await (const event of response.completion) {
        if (event.chunk) {
          const decoder = new TextDecoder('utf-8');
          const chunkText = decoder.decode(event.chunk.bytes);
          fullContent += chunkText;

          yield {
            content: chunkText,
            isComplete: false,
          };
        }

        if (event.trace) {
          this.logger.debug('Trace event:', JSON.stringify(event.trace));
        }
      }

      yield {
        content: '',
        isComplete: true,
        metadata: {
          totalLength: fullContent.length,
        },
      };

      this.logger.debug(`Message completed for session: ${sessionId.toString()}`);
    } catch (error) {
      this.logger.error(
        `Error sending message for session ${sessionId.toString()}:`,
        error,
      );

      const isRateLimitError = error.name === 'ThrottlingException' ||
                              error.message?.includes('rate') ||
                              error.message?.includes('throttl');

      if (isRateLimitError) {
        throw new Error('El agente está procesando muchas solicitudes. Por favor, espera unos segundos antes de enviar otro mensaje.');
      }

      throw new Error(`Bedrock Agent error: ${error.message}`);
    }
  }

  async initializeSession(sessionId: SessionId): Promise<void> {
    this.logger.log(`Initializing session: ${sessionId.toString()}`);
  }

  async endSession(sessionId: SessionId): Promise<void> {
    this.logger.log(`Ending session: ${sessionId.toString()}`);
  }
}
