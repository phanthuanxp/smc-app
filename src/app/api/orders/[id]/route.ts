import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const order = db.prepare(`SELECT o.*, s.channel, s.name as shop_name FROM orders o JOIN shops s ON o.shop_id=s.id WHERE o.id=?`).get(id);
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const items = db.prepare(`SELECT oi.*, p.name as product_name, p.sku FROM order_items oi JOIN products p ON oi.product_id=p.id WHERE oi.order_id=?`).all(id);
  return NextResponse.json({ order, items });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const { status, note } = await req.json();
  db.prepare(`UPDATE orders SET status=?, note=?, updated_at=datetime('now') WHERE id=?`).run(status, note, id);
  return NextResponse.json({ ok: true });
}
