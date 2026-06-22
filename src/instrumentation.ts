// Runs once at server startup. Start the auto-sync scheduler only in the
// Node.js runtime (not edge), so it can use better-sqlite3.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startScheduler } = await import('@/lib/scheduler');
    startScheduler();
  }
}
