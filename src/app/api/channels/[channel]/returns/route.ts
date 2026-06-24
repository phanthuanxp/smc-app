import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ChannelId } from '@/lib/channels/types';

export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get('shopId') ?? '';
  const status = searchParams.get('status') ?? '';

  let where = 'WHERE r.channel=?';
  const p: unknown[] = [ch];
  if (shopId) { where += ' AND r.shop_id=?'; p.push(Number(shopId)); }
  if (status) { where += ' AND r.status=?'; p.push(status); }

  // Seed mock returns if empty
  const count = (db.prepare('SELECT COUNT(*) as c FROM returns WHERE channel=?').get(ch) as { c: number }).c;
  if (count === 0) {
    const shops = db.prepare('SELECT id FROM shops WHERE channel=? LIMIT 2').all(ch) as { id: number }[];
    const orders = db.prepare('SELECT id, order_no, customer_name, total FROM orders WHERE shop_id IN (SELECT id FROM shops WHERE channel=?) LIMIT 10').all(ch) as { id: number; order_no: string; customer_name: string; total: number }[];
    if (shops.length > 0 && orders.length > 0) {
      const ins = db.prepare(`INSERT INTO returns (channel, order_id, order_no, shop_id, customer_name, reason, refund_amount, status, restock) VALUES (?,?,?,?,?,?,?,?,?)`);
      const reasons = ['Sản phẩm lỗi', 'Không đúng mô tả', 'Đổi size/màu', 'Không thích', 'Hàng giao sai'];
      const statuses = ['pending', 'pending', 'approved', 'approved', 'resolved'];
      for (let i = 0; i < Math.min(5, orders.length); i++) {
        const o = orders[i];
        ins.run(ch, o.id, o.order_no, shops[i % shops.length].id, o.customer_name,
          reasons[i % reasons.length], Math.round(o.total * 0.9), statuses[i % statuses.length], 1);
      }
    }
  }

  const returns = db.prepare(`
    SELECT r.*, s.name as shop_name
    FROM returns r
    LEFT JOIN shops s ON r.shop_id = s.id
    ${where}
    ORDER BY r.created_at DESC
  `).all(...p);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='pending' THEN 1 ELSE 0 END) as pending_count,
      SUM(refund_amount) as total_refund
    FROM returns WHERE channel=?
  `).get(ch) as { total: number; pending_count: number; total_refund: number };

  return NextResponse.json({ returns, stats });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const body = await req.json() as {
    orderId: number; orderNo: string; shopId: number;
    customerName: string; reason: string; refundAmount: number;
    items?: string; note?: string; restock?: number;
  };

  if (!body.orderId || !body.orderNo || !body.shopId || !body.customerName || !body.reason) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }

  const result = db.prepare(`
    INSERT INTO returns (channel, order_id, order_no, shop_id, customer_name, reason, refund_amount, items, note, restock, status)
    VALUES (?,?,?,?,?,?,?,?,?,'pending')
  `).run(ch, body.orderId, body.orderNo, body.shopId, body.customerName, body.reason,
    body.refundAmount ?? 0, body.items ?? '[]', body.note ?? '', body.restock ?? 1);

  return NextResponse.json({ ok: true, id: result.lastInsertRowid }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json() as { id: number; status: string; note?: string };
  const allowed = ['pending', 'approved', 'rejected', 'resolved'];
  if (!allowed.includes(body.status)) {
    return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
  }

  db.prepare(`
    UPDATE returns SET status=?, note=COALESCE(?,note),
    resolved_at=CASE WHEN ? IN ('approved','resolved','rejected') THEN datetime('now') ELSE resolved_at END
    WHERE id=?
  `).run(body.status, body.note ?? null, body.status, body.id);

  // Auto restock if approved/resolved
  if (body.status === 'approved' || body.status === 'resolved') {
    const ret = db.prepare(`SELECT items, restock FROM returns WHERE id=?`).get(body.id) as { items: string; restock: number } | undefined;
    if (ret?.restock && ret.items && ret.items !== '[]') {
      try {
        const items = JSON.parse(ret.items) as { productId: number; quantity: number }[];
        for (const item of items) {
          db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(item.quantity, item.productId);
          db.prepare(`INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)`).run(
            item.productId, 'return', item.quantity, `Hoàn trả đơn #${body.id}`
          );
        }
      } catch { /* invalid JSON, skip */ }
    }
  }

  return NextResponse.json({ ok: true });
}
