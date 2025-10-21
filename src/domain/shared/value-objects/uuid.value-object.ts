import { v4 as uuidv4, validate } from 'uuid';

export class UUID {
  private readonly value: string;

  private constructor(value: string) {
    this.value = value;
  }

  static create(): UUID {
    return new UUID(uuidv4());
  }

  static fromString(value: string): UUID {
    if (!validate(value)) {
      throw new Error(`Invalid UUID: ${value}`);
    }
    return new UUID(value);
  }

  toString(): string {
    return this.value;
  }

  equals(other: UUID): boolean {
    return this.value === other.value;
  }
}
