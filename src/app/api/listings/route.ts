import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/listings?channel=tiktok&shopId=1&productId=5
// Returns listings with shop + product details for a given channel/shop/product filter.
export async function GET(req: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const channel   = searchParams.get('channel') ?? '';
  const shopId    = searchParams.get('shopId') ?? '';
  const productId = searchParams.get('productId') ?? '';

  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (channel)   { where += ' AND s.channel=?';    params.push(channel); }
  if (shopId)    { where += ' AND l.shop_id=?';    params.push(Number(shopId)); }
  if (productId) { where += ' AND l.product_id=?'; params.push(Number(productId)); }

  const listings = db.prepare(`
    SELECT
      l.id, l.product_id, l.shop_id, l.external_id, l.status,
      l.price, l.stock, l.views, l.sales, l.published_at, l.updated_at,
      s.name as shop_name, s.channel,
      p.name as product_name, p.sku
    FROM listings l
    JOIN shops s ON l.shop_id = s.id
    JOIN products p ON l.product_id = p.id
    ${where}
    ORDER BY l.updated_at DESC
  `).all(...params);

  return NextResponse.json({ listings });
}

// PATCH /api/listings  — update listing status (e.g. mark inactive/active)
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const { id, status } = await req.json() as { id: number; status: string };
  const allowed = ['active', 'inactive', 'pending', 'error'];
  if (!allowed.includes(status)) {
    return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
  }
  db.prepare(`UPDATE listings SET status=?, updated_at=datetime('now') WHERE id=?`).run(status, id);
  return NextResponse.json({ ok: true });
}
