/** Log prayer errors without secrets (message + stack only). */
export function logPrayerError(context: string, error: unknown): void {
  if (error instanceof Error) {
    console.error(`[prayer] ${context}: ${error.message}`);
    if (error.stack) {
      console.error(error.stack);
    }
    return;
  }
  console.error(`[prayer] ${context}:`, error);
}
