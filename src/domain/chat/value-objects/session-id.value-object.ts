export class SessionId {
  private readonly value: string;

  private constructor(value: string) {
    this.validate(value);
    this.value = value;
  }

  static create(value: string): SessionId {
    return new SessionId(value);
  }

  private validate(value: string): void {
    if (!value || value.trim().length === 0) {
      throw new Error('Session ID cannot be empty');
    }

    const pattern = /^[a-zA-Z0-9-_]+$/;
    if (!pattern.test(value)) {
      throw new Error(
        'Session ID must contain only alphanumeric characters, hyphens, and underscores',
      );
    }
  }

  toString(): string {
    return this.value;
  }

  equals(other: SessionId): boolean {
    return this.value === other.value;
  }
}
