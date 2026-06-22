import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = getDb();
  seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const channel = searchParams.get('channel') ?? '';
  const status  = searchParams.get('status') ?? '';
  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (channel) { where += ' AND channel=?'; params.push(channel); }
  if (status)  { where += ' AND status=?'; params.push(status); }
  const shops = db.prepare(`SELECT * FROM shops ${where} ORDER BY channel, name`).all(...params);
  const counts = db.prepare(`SELECT channel, COUNT(*) as count, SUM(revenue) as revenue, SUM(orders) as orders FROM shops GROUP BY channel`).all();
  return NextResponse.json({ shops, counts });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { name, channel } = await req.json();
  const result = db.prepare(`INSERT INTO shops (name, channel) VALUES (?, ?)`).run(name, channel);
  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
