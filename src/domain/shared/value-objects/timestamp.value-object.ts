export class Timestamp {
  private readonly value: Date;

  private constructor(value: Date) {
    this.value = value;
  }

  static now(): Timestamp {
    return new Timestamp(new Date());
  }

  static fromDate(date: Date): Timestamp {
    return new Timestamp(date);
  }

  static fromISOString(isoString: string): Timestamp {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) {
      throw new Error(`Invalid ISO string: ${isoString}`);
    }
    return new Timestamp(date);
  }

  toDate(): Date {
    return new Date(this.value);
  }

  toISOString(): string {
    return this.value.toISOString();
  }

  isBefore(other: Timestamp): boolean {
    return this.value < other.value;
  }

  isAfter(other: Timestamp): boolean {
    return this.value > other.value;
  }
}
