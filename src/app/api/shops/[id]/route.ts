import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const shop = db.prepare('SELECT * FROM shops WHERE id=?').get(id);
  if (!shop) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const logs = db.prepare(
    "SELECT * FROM sync_logs WHERE shop_name=(SELECT name FROM shops WHERE id=?) ORDER BY created_at DESC LIMIT 10"
  ).all(id);

  // 7-day revenue + orders from daily_stats for this shop's channel
  const stats = db.prepare(`
    SELECT date, SUM(gmv) as revenue, SUM(orders) as orders
    FROM daily_stats
    WHERE channel=(SELECT channel FROM shops WHERE id=?)
      AND date >= date('now','-6 days')
    GROUP BY date ORDER BY date ASC
  `).all(id);

  const listings = db.prepare(
    'SELECT COUNT(*) as total, SUM(CASE WHEN status=\'active\' THEN 1 ELSE 0 END) as active FROM listings WHERE shop_id=?'
  ).get(id) as { total: number; active: number };

  return NextResponse.json({ shop, logs, stats, listings });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json() as Record<string, unknown>;
  const allowed = ['name', 'status'];
  const fields = Object.keys(body).filter(k => allowed.includes(k));
  if (fields.length === 0) return NextResponse.json({ ok: true });
  const set = fields.map(f => `${f}=?`).join(', ');
  db.prepare(`UPDATE shops SET ${set} WHERE id=?`).run(...fields.map(f => body[f]), id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM listings WHERE shop_id=?').run(id);
  db.prepare('DELETE FROM shops WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
