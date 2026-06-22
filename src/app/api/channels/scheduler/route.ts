import { NextRequest, NextResponse } from 'next/server';
import { getSchedulerState, startScheduler, stopScheduler, runSyncNow } from '@/lib/scheduler';

export async function GET() {
  return NextResponse.json({ scheduler: getSchedulerState() });
}

// Body: { action: 'start' | 'stop' | 'run' }
export async function POST(req: NextRequest) {
  const { action } = await req.json();
  if (action === 'start') startScheduler();
  else if (action === 'stop') stopScheduler();
  else if (action === 'run') { const s = await runSyncNow(); return NextResponse.json({ scheduler: s }); }
  else return NextResponse.json({ error: 'Hành động không hợp lệ' }, { status: 400 });
  return NextResponse.json({ scheduler: getSchedulerState() });
}
