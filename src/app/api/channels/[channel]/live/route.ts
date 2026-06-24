import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ChannelId } from '@/lib/channels/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get('shopId') ?? '';
  const week = searchParams.get('week') ?? '0'; // offset from current week

  // Build week range
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay() + 1 + Number(week) * 7); // Monday
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  let where = `WHERE ls.channel=? AND ls.scheduled_at >= ? AND ls.scheduled_at <= ?`;
  const p: unknown[] = [ch, weekStart.toISOString(), weekEnd.toISOString()];
  if (shopId) { where += ' AND ls.shop_id=?'; p.push(Number(shopId)); }

  // Seed mock sessions if none exist
  const total = (db.prepare('SELECT COUNT(*) as c FROM live_sessions WHERE channel=?').get(ch) as { c: number }).c;
  if (total === 0) {
    const shops = db.prepare('SELECT id FROM shops WHERE channel=? LIMIT 3').all(ch) as { id: number }[];
    if (shops.length > 0) {
      const ins = db.prepare(`INSERT INTO live_sessions (channel, shop_id, title, scheduled_at, duration_minutes, status, viewer_count, orders_count, gmv) VALUES (?,?,?,?,?,?,?,?,?)`);
      const mockSessions = [
        { title: 'Flash Sale Cuối Tuần', dayOffset: 1, hour: 20, dur: 90, status: 'scheduled', views: 0, orders: 0, gmv: 0 },
        { title: 'Live Review SP Mới', dayOffset: 3, hour: 19, dur: 60, status: 'scheduled', views: 0, orders: 0, gmv: 0 },
        { title: 'Mega Sale Thứ 6', dayOffset: 5, hour: 21, dur: 120, status: 'scheduled', views: 0, orders: 0, gmv: 0 },
        { title: 'Live Mùa Hè', dayOffset: -7, hour: 20, dur: 90, status: 'ended', views: 3420, orders: 87, gmv: 12500000 },
        { title: 'Giới thiệu bộ sưu tập mới', dayOffset: -5, hour: 19, dur: 60, status: 'ended', views: 1850, orders: 42, gmv: 6300000 },
      ];
      for (const s of mockSessions) {
        const dt = new Date(); dt.setDate(dt.getDate() + s.dayOffset); dt.setHours(s.hour, 0, 0, 0);
        ins.run(ch, shops[0].id, s.title, dt.toISOString(), s.dur, s.status, s.views, s.orders, s.gmv);
      }
    }
  }

  const sessions = db.prepare(`
    SELECT ls.*, s.name as shop_name
    FROM live_sessions ls
    LEFT JOIN shops s ON ls.shop_id = s.id
    ${where}
    ORDER BY ls.scheduled_at ASC
  `).all(...p);

  const stats = db.prepare(`
    SELECT COUNT(*) as total, SUM(viewer_count) as total_viewers,
           SUM(orders_count) as total_orders, SUM(gmv) as total_gmv
    FROM live_sessions WHERE channel=? AND status='ended'
  `).get(ch) as { total: number; total_viewers: number; total_orders: number; total_gmv: number };

  return NextResponse.json({
    sessions,
    stats,
    weekStart: weekStart.toISOString(),
    weekEnd: weekEnd.toISOString(),
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const body = await req.json() as {
    shopId: number; title: string; scheduledAt: string;
    durationMinutes?: number; products?: string; script?: string;
  };

  if (!body.shopId || !body.title || !body.scheduledAt) {
    return NextResponse.json({ error: 'Thiếu shopId, title hoặc scheduledAt' }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO live_sessions (channel, shop_id, title, scheduled_at, duration_minutes, products, script, status)
    VALUES (?,?,?,?,?,?,?,'scheduled')
  `).run(ch, body.shopId, body.title, body.scheduledAt, body.durationMinutes ?? 60, body.products ?? '[]', body.script ?? '');

  return NextResponse.json({ ok: true, id: result.lastInsertRowid }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json() as {
    id: number; status?: string; script?: string;
    products?: string; title?: string; scheduledAt?: string; durationMinutes?: number;
  };
  const sets: string[] = [`updated_at=datetime('now')`];
  const vals: unknown[] = [];
  if (body.status) { sets.push('status=?'); vals.push(body.status); }
  if (body.script !== undefined) { sets.push('script=?'); vals.push(body.script); }
  if (body.products !== undefined) { sets.push('products=?'); vals.push(body.products); }
  if (body.title) { sets.push('title=?'); vals.push(body.title); }
  if (body.scheduledAt) { sets.push('scheduled_at=?'); vals.push(body.scheduledAt); }
  if (body.durationMinutes) { sets.push('duration_minutes=?'); vals.push(body.durationMinutes); }
  vals.push(body.id);
  db.prepare(`UPDATE live_sessions SET ${sets.join(',')} WHERE id=?`).run(...vals);
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const db = getDb();
  const { id } = await req.json() as { id: number };
  db.prepare('DELETE FROM live_sessions WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
