import { getDb } from '@/lib/db';
import { getAdapter } from './registry';
import { ChannelId } from './types';

interface LogEntry {
  type: 'pull' | 'stock_push' | 'sale';
  channel?: string;
  shopName?: string;
  sku?: string;
  status: 'success' | 'error';
  message?: string;
}

export function logSync(e: LogEntry) {
  getDb().prepare(
    `INSERT INTO sync_logs (type, channel, shop_name, sku, status, message)
     VALUES (?,?,?,?,?,?)`
  ).run(e.type, e.channel ?? null, e.shopName ?? null, e.sku ?? null, e.status, e.message ?? null);
}

// Push the master product's current stock to EVERY active listing/channel.
// This is the heart of anti-oversell: one source of truth (products.stock)
// fanned out to all sales channels.
export async function propagateStock(productId: number) {
  const db = getDb();
  const product = db.prepare('SELECT id, sku, stock FROM products WHERE id=?').get(productId) as
    | { id: number; sku: string; stock: number } | undefined;
  if (!product) return [];

  const listings = db.prepare(
    `SELECT l.id, l.shop_id, s.name as shop_name, s.channel
     FROM listings l JOIN shops s ON l.shop_id = s.id
     WHERE l.product_id=? AND l.status='active'`
  ).all(productId) as { id: number; shop_id: number; shop_name: string; channel: ChannelId }[];

  const results = [];
  for (const lst of listings) {
    const adapter = getAdapter(lst.channel);
    if (!adapter) continue;
    const r = await adapter.updateStock(lst.shop_name, product.sku, product.stock, {});
    // Mirror the pushed stock locally so our listing view matches the channel.
    db.prepare('UPDATE listings SET stock=?, updated_at=datetime(\'now\') WHERE id=?')
      .run(product.stock, lst.id);
    logSync({ type: 'stock_push', channel: lst.channel, shopName: lst.shop_name, sku: product.sku, status: r.status, message: r.message });
    results.push(r);
  }
  return results;
}

// Record a sale on ANY channel: decrement the master stock once, then
// propagate the new level to all channels so nobody oversells.
export async function recordSale(productId: number, qty: number, note?: string) {
  const db = getDb();
  const product = db.prepare('SELECT id, sku, stock FROM products WHERE id=?').get(productId) as
    | { id: number; sku: string; stock: number } | undefined;
  if (!product) return { ok: false, error: 'Sản phẩm không tồn tại' };

  const newStock = Math.max(0, product.stock - qty);
  db.prepare('UPDATE products SET stock=?, updated_at=datetime(\'now\') WHERE id=?').run(newStock, productId);
  db.prepare('INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)')
    .run(productId, 'out', qty, note ?? 'Bán hàng (đồng bộ đa kênh)');
  logSync({ type: 'sale', sku: product.sku, status: 'success', message: `Bán ${qty}, tồn còn ${newStock}` });

  const pushed = await propagateStock(productId);
  return { ok: true, sku: product.sku, newStock, pushed };
}

// Pull-sync every active shop with its channel platform.
export async function syncAllShops() {
  const db = getDb();
  const shops = db.prepare("SELECT id, name, channel FROM shops WHERE status IN ('active','error')")
    .all() as { id: number; name: string; channel: ChannelId }[];
  const results = [];
  for (const shop of shops) {
    const adapter = getAdapter(shop.channel);
    if (!adapter) continue;
    const r = await adapter.syncShop(shop.name, {});
    db.prepare('UPDATE shops SET status=? WHERE id=?').run(r.status === 'error' ? 'error' : 'active', shop.id);
    logSync({ type: 'pull', channel: shop.channel, shopName: shop.name, status: r.status, message: r.message });
    results.push(r);
  }
  return results;
}
