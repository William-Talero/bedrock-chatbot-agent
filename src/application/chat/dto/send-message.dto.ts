import { IsString, IsNotEmpty, MaxLength, IsOptional, IsObject } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  content: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
