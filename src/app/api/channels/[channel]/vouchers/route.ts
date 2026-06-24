import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ChannelId } from '@/lib/channels/types';

// GET /api/channels/tiktok/vouchers?shopId=1&status=active
export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get('shopId') ?? '';
  const status = searchParams.get('status') ?? '';

  let where = 'WHERE v.channel=?';
  const p: unknown[] = [ch];
  if (shopId) { where += ' AND v.shop_id=?'; p.push(Number(shopId)); }
  if (status) { where += ' AND v.status=?'; p.push(status); }

  const vouchers = db.prepare(`
    SELECT v.*, s.name as shop_name
    FROM vouchers v
    LEFT JOIN shops s ON v.shop_id = s.id
    ${where}
    ORDER BY v.created_at DESC
  `).all(...p);

  return NextResponse.json({ vouchers });
}

// POST /api/channels/tiktok/vouchers
export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const body = await req.json() as {
    shopId: number; code: string;
    discountType: 'percent' | 'fixed';
    discountValue: number;
    minPurchase?: number;
    maxDiscount?: number;
    usageLimit?: number;
    startAt: string; endAt: string;
  };

  if (!body.shopId || !body.code || !body.discountValue || !body.startAt || !body.endAt) {
    return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
  }

  // Validate code unique within shop
  const existing = db.prepare('SELECT id FROM vouchers WHERE code=? AND shop_id=? AND status != ?').get(body.code, body.shopId, 'cancelled');
  if (existing) return NextResponse.json({ error: `Mã voucher "${body.code}" đã tồn tại trong shop này` }, { status: 409 });

  const shop = db.prepare('SELECT id FROM shops WHERE id=? AND channel=?').get(body.shopId, ch);
  if (!shop) return NextResponse.json({ error: 'Shop không tồn tại' }, { status: 404 });

  const result = db.prepare(`
    INSERT INTO vouchers (channel, shop_id, code, discount_type, discount_value, min_purchase, max_discount, usage_limit, start_at, end_at, status)
    VALUES (?,?,?,?,?,?,?,?,?,?,'active')
  `).run(
    ch, body.shopId, body.code.toUpperCase(),
    body.discountType ?? 'percent',
    body.discountValue,
    body.minPurchase ?? 0,
    body.maxDiscount ?? 0,
    body.usageLimit ?? 100,
    body.startAt, body.endAt,
  );

  return NextResponse.json({ ok: true, id: result.lastInsertRowid }, { status: 201 });
}

// PATCH — update status or increment usage
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, status, incrementUsage } = await req.json() as { id: number; status?: string; incrementUsage?: boolean };

  if (incrementUsage) {
    db.prepare(`UPDATE vouchers SET usage_count = usage_count + 1 WHERE id=?`).run(id);
    return NextResponse.json({ ok: true });
  }

  const allowed = ['active', 'inactive', 'cancelled', 'expired'];
  if (!status || !allowed.includes(status)) return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
  db.prepare(`UPDATE vouchers SET status=? WHERE id=?`).run(status, id);
  return NextResponse.json({ ok: true });
}
