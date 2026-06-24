import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAdapter } from '@/lib/channels/registry';
import { logSync } from '@/lib/channels/sync-engine';
import { ChannelId } from '@/lib/channels/types';

// POST /api/channels/tiktok/publish
// Body: { productId: number, shopId: number, priceOverride?: number }
// Publishes a product to a specific shop on the channel.
export async function POST(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const body = await req.json();
  const { productId, shopId, priceOverride } = body as {
    productId: number; shopId: number; priceOverride?: number;
  };

  if (!productId || !shopId) {
    return NextResponse.json({ error: 'Thiếu productId hoặc shopId' }, { status: 400 });
  }

  const db = getDb();

  const product = db.prepare(
    'SELECT id, sku, name, description, price, sale_price, stock, category FROM products WHERE id=?'
  ).get(productId) as {
    id: number; sku: string; name: string; description: string;
    price: number; sale_price: number; stock: number; category: string;
  } | undefined;
  if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });

  const shop = db.prepare(
    'SELECT id, name, channel, access_token, refresh_token, external_shop_id FROM shops WHERE id=? AND channel=?'
  ).get(shopId, ch) as {
    id: number; name: string; channel: string;
    access_token: string | null; refresh_token: string | null; external_shop_id: string | null;
  } | undefined;
  if (!shop) return NextResponse.json({ error: 'Shop không tồn tại hoặc không thuộc kênh này' }, { status: 404 });

  // Check if listing already exists
  const existing = db.prepare(
    'SELECT id, status FROM listings WHERE product_id=? AND shop_id=?'
  ).get(productId, shopId) as { id: number; status: string } | undefined;

  if (existing && existing.status === 'active') {
    return NextResponse.json({ error: 'Sản phẩm đã được đăng lên shop này rồi', listingId: existing.id }, { status: 409 });
  }

  const adapter = getAdapter(ch);
  if (!adapter) return NextResponse.json({ error: 'Kênh không hỗ trợ' }, { status: 400 });

  const sellPrice = priceOverride ?? product.sale_price ?? product.price;

  const result = await adapter.publishProduct(shop.name, {
    sku: product.sku,
    name: product.name,
    description: product.description ?? product.name,
    price: sellPrice,
    stock: product.stock,
    category: product.category,
  }, {
    accessToken: shop.access_token ?? undefined,
    refreshToken: shop.refresh_token ?? undefined,
    shopId: shop.external_shop_id ?? undefined,
  });

  // Save or update listing record
  if (existing) {
    db.prepare(
      `UPDATE listings SET status=?, external_id=?, price=?, stock=?, updated_at=datetime('now') WHERE id=?`
    ).run(result.status === 'success' ? 'active' : 'error', result.externalId ?? '', sellPrice, product.stock, existing.id);
  } else {
    db.prepare(
      `INSERT INTO listings (product_id, shop_id, external_id, status, price, stock, published_at)
       VALUES (?,?,?,?,?,?,datetime('now'))`
    ).run(productId, shopId, result.externalId ?? '', result.status === 'success' ? 'active' : 'pending', sellPrice, product.stock);
  }

  logSync({
    type: 'pull',
    channel: ch,
    shopName: shop.name,
    sku: product.sku,
    status: result.status === 'success' ? 'success' : 'error',
    message: result.message,
  });

  return NextResponse.json({
    ok: result.status === 'success',
    externalId: result.externalId,
    message: result.message,
    status: result.status,
  });
}
