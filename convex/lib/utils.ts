/**
 * Asserts that a database document exists, narrowing 'T | null' to 'T'
 * or aborting the transaction immediately with a clean error message.
 */
export function assertExists<T>(document: T | null | undefined, errorMessage: string): T {
  if (!document) {
    throw new Error(`[Transaction Aborted]: ${errorMessage}`);
  }
  return document;
}
