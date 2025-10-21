export class MessageContent {
  private readonly value: string;
  private static readonly MAX_LENGTH = 10000;

  private constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  static create(value: string): MessageContent {
    return new MessageContent(value);
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Message content cannot be empty');
    }

    if (value.length > MessageContent.MAX_LENGTH) {
      throw new Error(
        `Message content exceeds maximum length of ${MessageContent.MAX_LENGTH} characters`,
      );
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: MessageContent): boolean {
    return this.value === other.value;
  }
}
