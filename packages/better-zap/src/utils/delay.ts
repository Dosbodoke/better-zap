/**
 * Utility function to pause execution for a given number of milliseconds.
 * Useful for exponential backoff or rate limiting.
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
