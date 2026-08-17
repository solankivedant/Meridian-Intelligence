// Wraps a DB call so pages render a friendly empty state (instead of a hard
// 500) before DATABASE_URL points at a real, migrated database.
export async function safeQuery<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    console.error("Database query failed:", err);
    return fallback;
  }
}
