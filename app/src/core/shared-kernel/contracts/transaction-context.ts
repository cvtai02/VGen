export interface TransactionContext<TContext> {
  run<T>(work: (context: TContext) => Promise<T>): Promise<T>;
}
