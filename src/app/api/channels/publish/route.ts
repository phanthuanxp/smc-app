import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAdapter } from '@/lib/channels/registry';
import { ChannelId, ProductPayload } from '@/lib/channels/types';

// Publish one product to a set of selected shops across channels.
// Body: { productId: number, shops: [{ channel, shopName }] }
export async function POST(req: NextRequest) {
  const db = getDb();
  const { productId, shops } = await req.json();

  const product = db.prepare('SELECT * FROM products WHERE id=?').get(productId) as
    | { id: number; sku: string; name: string; description: string; price: number; stock: number; category: string }
    | undefined;
  if (!product) return NextResponse.json({ error: 'Sản phẩm không tồn tại' }, { status: 404 });

  const payload: ProductPayload = {
    sku: product.sku, name: product.name, description: product.description,
    price: product.price, stock: product.stock, category: product.category,
  };

  const results = [];
  for (const { channel, shopName } of shops as { channel: ChannelId; shopName: string }[]) {
    const adapter = getAdapter(channel);
    if (!adapter) {
      results.push({ channel, shopName, status: 'error', message: 'Kênh không hỗ trợ' });
      continue;
    }
    // Real adapters would load OAuth creds for this shop here.
    const r = await adapter.publishProduct(shopName, payload, {});
    results.push(r);

    // Record a listing row reflecting the publish outcome.
    const shopRow = db.prepare('SELECT id FROM shops WHERE name=?').get(shopName) as { id: number } | undefined;
    if (shopRow) {
      db.prepare(
        `INSERT INTO listings (product_id, shop_id, external_id, status, price, stock, published_at)
         VALUES (?,?,?,?,?,?,datetime('now'))`
      ).run(
        product.id, shopRow.id, r.externalId ?? null,
        r.status === 'success' ? 'active' : 'error',
        product.price, product.stock
      );
    }
  }

  return NextResponse.json({ results });
}
