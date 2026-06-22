import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';
import { recordSale } from '@/lib/channels/sync-engine';

export async function GET(req: NextRequest) {
  const db = getDb();
  seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const q      = searchParams.get('q') ?? '';
  const status = searchParams.get('status') ?? '';
  const page   = parseInt(searchParams.get('page') ?? '1');
  const limit  = 20;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (q)      { where += ' AND (o.order_no LIKE ? OR o.customer_name LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (status) { where += ' AND o.status=?'; params.push(status); }

  const orders = db.prepare(`
    SELECT o.*, s.channel, s.name as shop_name
    FROM orders o JOIN shops s ON o.shop_id=s.id
    ${where} ORDER BY o.created_at DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as c FROM orders o ${where}`).get(...params) as { c: number }).c;
  return NextResponse.json({ orders, total, page });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { order_no, customer_name, customer_phone, customer_address, shop_id, total, shipping_fee, note, items } = body;
  const result = db.prepare(`
    INSERT INTO orders (order_no, customer_name, customer_phone, customer_address, shop_id, total, shipping_fee, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(order_no, customer_name, customer_phone, customer_address, shop_id, total, shipping_fee ?? 0, note ?? '');
  const orderId = result.lastInsertRowid;
  if (Array.isArray(items)) {
    for (const item of items) {
      db.prepare(`INSERT INTO order_items (order_id, product_id, quantity, price, total) VALUES (?,?,?,?,?)`).run(orderId, item.product_id, item.quantity, item.price, item.total);
      // Anti-oversell: a sale on this channel deducts master stock and pushes
      // the new level to every other channel.
      await recordSale(item.product_id, item.quantity, `Đơn ${order_no}`);
    }
  }
  return NextResponse.json({ id: orderId }, { status: 201 });
}
