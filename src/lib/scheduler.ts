import { syncAllShops, logSync } from '@/lib/channels/sync-engine';

// Lightweight in-process scheduler for automatic periodic channel sync.
// In production this would be a proper job queue / external cron, but this
// gives a working auto-sync loop for the app out of the box.

interface SchedulerState {
  enabled: boolean;
  intervalMinutes: number;
  lastRunAt: string | null;
  nextRunAt: string | null;
  lastResult: { success: number; error: number } | null;
  running: boolean;
}

const INTERVAL_MIN = Number(process.env.SYNC_INTERVAL_MINUTES ?? 10);

// Persist across HMR reloads in dev via globalThis.
const g = globalThis as unknown as { __smcScheduler?: { state: SchedulerState; timer: NodeJS.Timeout | null } };

if (!g.__smcScheduler) {
  g.__smcScheduler = {
    state: {
      enabled: false,
      intervalMinutes: INTERVAL_MIN,
      lastRunAt: null,
      nextRunAt: null,
      lastResult: null,
      running: false,
    },
    timer: null,
  };
}

export function getSchedulerState(): SchedulerState {
  return g.__smcScheduler!.state;
}

async function tick() {
  const s = g.__smcScheduler!.state;
  if (s.running) return;
  s.running = true;
  try {
    const results = await syncAllShops();
    s.lastResult = {
      success: results.filter(r => r.status === 'success').length,
      error: results.filter(r => r.status === 'error').length,
    };
    s.lastRunAt = new Date().toISOString();
  } catch (e) {
    logSync({ type: 'pull', status: 'error', message: e instanceof Error ? e.message : 'Scheduler tick failed' });
  } finally {
    s.running = false;
    s.nextRunAt = new Date(Date.now() + s.intervalMinutes * 60_000).toISOString();
  }
}

export function startScheduler() {
  const ref = g.__smcScheduler!;
  if (ref.timer) return; // already started
  ref.state.enabled = true;
  ref.state.nextRunAt = new Date(Date.now() + ref.state.intervalMinutes * 60_000).toISOString();
  ref.timer = setInterval(tick, ref.state.intervalMinutes * 60_000);
  // Avoid keeping the dev process alive solely for the timer.
  if (typeof ref.timer.unref === 'function') ref.timer.unref();
}

export function stopScheduler() {
  const ref = g.__smcScheduler!;
  if (ref.timer) { clearInterval(ref.timer); ref.timer = null; }
  ref.state.enabled = false;
  ref.state.nextRunAt = null;
}

// Manual trigger used by the "Sync now" button — also refreshes timing state.
export async function runSyncNow() {
  await tick();
  return g.__smcScheduler!.state;
}
