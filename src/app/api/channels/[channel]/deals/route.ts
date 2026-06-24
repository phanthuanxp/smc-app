import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ChannelId } from '@/lib/channels/types';

// GET /api/channels/tiktok/deals?shopId=1&status=active
export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get('shopId') ?? '';
  const status = searchParams.get('status') ?? '';

  let where = 'WHERE d.channel=?';
  const p: unknown[] = [ch];
  if (shopId) { where += ' AND d.shop_id=?'; p.push(Number(shopId)); }
  if (status) { where += ' AND d.status=?'; p.push(status); }

  const deals = db.prepare(`
    SELECT d.*, s.name as shop_name
    FROM deals d
    LEFT JOIN shops s ON d.shop_id = s.id
    ${where}
    ORDER BY d.start_at DESC
  `).all(...p);

  return NextResponse.json({ deals });
}

// POST /api/channels/tiktok/deals
export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const body = await req.json() as {
    shopId: number; name: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minPurchase?: number;
    maxDiscount?: number;
    startAt: string; endAt: string;
    products?: number[];
  };

  if (!body.shopId || !body.name || !body.discountValue || !body.startAt || !body.endAt) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }

  const shop = db.prepare('SELECT id FROM shops WHERE id=? AND channel=?').get(body.shopId, ch);
  if (!shop) return NextResponse.json({ error: 'Shop không tồn tại' }, { status: 404 });

  const result = db.prepare(`
    INSERT INTO deals (channel, shop_id, name, discount_type, discount_value, min_purchase, max_discount, start_at, end_at, status, products)
    VALUES (?,?,?,?,?,?,?,?,?,'scheduled',?)
  `).run(
    ch, body.shopId, body.name,
    body.discountType ?? 'percent',
    body.discountValue,
    body.minPurchase ?? 0,
    body.maxDiscount ?? 0,
    body.startAt, body.endAt,
    JSON.stringify(body.products ?? []),
  );

  return NextResponse.json({ ok: true, id: result.lastInsertRowid }, { status: 201 });
}

// PATCH /api/channels/tiktok/deals — update status
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, status } = await req.json() as { id: number; status: string };
  const allowed = ['scheduled', 'active', 'ended', 'cancelled'];
  if (!allowed.includes(status)) return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
  db.prepare(`UPDATE deals SET status=? WHERE id=?`).run(status, id);
  return NextResponse.json({ ok: true });
}
