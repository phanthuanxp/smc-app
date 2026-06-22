import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSchedulerState } from '@/lib/scheduler';

export async function GET() {
  const db = getDb();
  const logs = db.prepare(
    'SELECT * FROM sync_logs ORDER BY created_at DESC, id DESC LIMIT 40'
  ).all();
  const summary = {
    success: (db.prepare("SELECT COUNT(*) as c FROM sync_logs WHERE status='success'").get() as { c: number }).c,
    error: (db.prepare("SELECT COUNT(*) as c FROM sync_logs WHERE status='error'").get() as { c: number }).c,
  };
  return NextResponse.json({ logs, summary, scheduler: getSchedulerState() });
}
