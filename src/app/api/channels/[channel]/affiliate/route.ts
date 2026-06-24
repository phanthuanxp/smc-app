import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ChannelId } from '@/lib/channels/types';

// GET /api/channels/tiktok/affiliate?shopId=1
export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const shopId = searchParams.get('shopId') ?? '';
  const type = searchParams.get('type') ?? 'products'; // products | creators

  if (type === 'creators') {
    let where = 'WHERE ac.channel=?';
    const p: unknown[] = [ch];
    if (shopId) { where += ' AND ac.shop_id=?'; p.push(Number(shopId)); }

    // Seed mock creators if empty
    const count = (db.prepare('SELECT COUNT(*) as c FROM affiliate_creators WHERE channel=?').get(ch) as { c: number }).c;
    if (count === 0 && shopId) {
      const mockCreators = [
        { name: 'Nguyễn Thảo Linh', handle: '@thaolinhbeauty', followers: 285000, gmv: 12500000, orders: 87, commission: 1250000 },
        { name: 'Trần Minh Khoa', handle: '@minhkhoafashion', followers: 142000, gmv: 8700000, orders: 53, commission: 870000 },
        { name: 'Lê Bảo Châu', handle: '@baochautiktok', followers: 520000, gmv: 31200000, orders: 201, commission: 3120000 },
        { name: 'Phạm Quỳnh Anh', handle: '@quynhanh_oc', followers: 95000, gmv: 4300000, orders: 31, commission: 430000 },
        { name: 'Hoàng Đức Việt', handle: '@ducviet_review', followers: 380000, gmv: 18900000, orders: 124, commission: 1890000 },
      ];
      const ins = db.prepare(`INSERT INTO affiliate_creators (channel, shop_id, creator_name, creator_handle, followers, gmv, orders, commission_earned) VALUES (?,?,?,?,?,?,?,?)`);
      for (const c of mockCreators) ins.run(ch, Number(shopId), c.name, c.handle, c.followers, c.gmv, c.orders, c.commission);
    }

    const creators = db.prepare(`
      SELECT ac.*, s.name as shop_name
      FROM affiliate_creators ac
      LEFT JOIN shops s ON ac.shop_id = s.id
      ${where}
      ORDER BY ac.gmv DESC
    `).all(...p);

    const stats = db.prepare(`
      SELECT
        COUNT(*) as total_creators,
        SUM(gmv) as total_gmv,
        SUM(orders) as total_orders,
        SUM(commission_earned) as total_commission
      FROM affiliate_creators WHERE channel=?
    `).get(ch) as { total_creators: number; total_gmv: number; total_orders: number; total_commission: number };

    return NextResponse.json({ creators, stats });
  }

  // type = products
  let where = 'WHERE ap.channel=?';
  const p: unknown[] = [ch];
  if (shopId) { where += ' AND ap.shop_id=?'; p.push(Number(shopId)); }

  const affiliateProducts = db.prepare(`
    SELECT ap.*, p.name as product_name, p.sku, p.price, p.sale_price, p.category,
           s.name as shop_name
    FROM affiliate_products ap
    JOIN products p ON ap.product_id = p.id
    JOIN shops s ON ap.shop_id = s.id
    ${where}
    ORDER BY ap.revenue DESC
  `).all(...p);

  const stats = db.prepare(`
    SELECT
      COUNT(*) as enrolled,
      SUM(clicks) as total_clicks,
      SUM(conversions) as total_conversions,
      SUM(revenue) as total_revenue,
      AVG(commission_rate) as avg_commission
    FROM affiliate_products WHERE channel=?
  `).get(ch) as { enrolled: number; total_clicks: number; total_conversions: number; total_revenue: number; avg_commission: number };

  return NextResponse.json({ affiliateProducts, stats });
}

// POST — enroll product into affiliate
export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const db = getDb();
  const body = await req.json() as { productId: number; shopId: number; commissionRate: number };

  if (!body.productId || !body.shopId || body.commissionRate == null) {
    return NextResponse.json({ error: 'Thiếu productId, shopId hoặc commissionRate' }, { status: 400 });
  }
  if (body.commissionRate < 0 || body.commissionRate > 80) {
    return NextResponse.json({ error: 'Hoa hồng phải trong khoảng 0–80%' }, { status: 400 });
  }

  const existing = db.prepare('SELECT id FROM affiliate_products WHERE product_id=? AND shop_id=? AND channel=?').get(body.productId, body.shopId, ch);
  if (existing) {
    return NextResponse.json({ error: 'Sản phẩm đã được đăng ký Affiliate trong shop này' }, { status: 409 });
  }

  // Seed some mock performance data
  const clicks = Math.floor(Math.random() * 2000) + 100;
  const conversions = Math.floor(clicks * (Math.random() * 0.08 + 0.02));
  const product = db.prepare('SELECT price, sale_price FROM products WHERE id=?').get(body.productId) as { price: number; sale_price: number } | undefined;
  const price = product?.sale_price || product?.price || 0;
  const revenue = conversions * price;

  const result = db.prepare(`
    INSERT INTO affiliate_products (channel, shop_id, product_id, commission_rate, status, clicks, conversions, revenue)
    VALUES (?,?,?,?,?,?,?,?)
  `).run(ch, body.shopId, body.productId, body.commissionRate, 'active', clicks, conversions, revenue);

  return NextResponse.json({ ok: true, id: result.lastInsertRowid }, { status: 201 });
}

// PATCH — update commission rate or status
export async function PATCH(req: NextRequest) {
  const db = getDb();
  const body = await req.json() as { id: number; commissionRate?: number; status?: string };

  if (body.commissionRate != null) {
    db.prepare(`UPDATE affiliate_products SET commission_rate=?, updated_at=datetime('now') WHERE id=?`).run(body.commissionRate, body.id);
  }
  if (body.status) {
    const allowed = ['active', 'paused', 'ended'];
    if (!allowed.includes(body.status)) return NextResponse.json({ error: 'Trạng thái không hợp lệ' }, { status: 400 });
    db.prepare(`UPDATE affiliate_products SET status=?, updated_at=datetime('now') WHERE id=?`).run(body.status, body.id);
  }
  return NextResponse.json({ ok: true });
}
