import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = getDb();
  seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') ?? '';
  const status  = searchParams.get('status') ?? '';
  const q       = searchParams.get('q') ?? '';
  const sort    = searchParams.get('sort') ?? 'channel';
  const SORT_MAP: Record<string, string> = {
    channel: 'channel, name',
    revenue: 'revenue DESC',
    orders: 'orders DESC',
    connected_at: 'connected_at DESC',
    name: 'name ASC',
  };
  const orderBy = SORT_MAP[sort] ?? 'channel, name';
  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (channel) { where += ' AND channel=?'; params.push(channel); }
  if (status)  { where += ' AND status=?'; params.push(status); }
  if (q)       { where += ' AND s.name LIKE ?'; params.push(`%${q}%`); }

  const shops = db.prepare(`
    SELECT s.*,
      (SELECT MAX(created_at) FROM sync_logs WHERE shop_name=s.name) as last_sync_at,
      (SELECT COUNT(*) FROM listings WHERE shop_id=s.id) as listing_count
    FROM shops s ${where} ORDER BY ${orderBy}
  `).all(...params);

  const counts = db.prepare(
    `SELECT channel, COUNT(*) as count, SUM(revenue) as revenue, SUM(orders) as orders FROM shops GROUP BY channel`
  ).all();

  const summary = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN status='error' THEN 1 ELSE 0 END) as error,
      SUM(CASE WHEN status='inactive' THEN 1 ELSE 0 END) as inactive,
      SUM(revenue) as revenue,
      SUM(orders) as orders
    FROM shops
  `).get();

  return NextResponse.json({ shops, counts, summary });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { name, channel } = await req.json();
  const result = db.prepare(`INSERT INTO shops (name, channel) VALUES (?, ?)`).run(name, channel);
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
