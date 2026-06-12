export class ConcurrencyLimiter {
  private running = 0;

  constructor(private readonly max: number) {}

  get isFull(): boolean {
    return this.running >= this.max;
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    this.running++;
    try {
      return await fn();
    } finally {
      this.running--;
    }
  }
}
