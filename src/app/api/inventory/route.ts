import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = getDb();
  seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') ?? 'all'; // all | low | out
  let where = 'WHERE 1=1';
  if (filter === 'low') where = 'WHERE stock > 0 AND stock < 50';
  if (filter === 'out') where = 'WHERE stock = 0';

  const products = db.prepare(`SELECT * FROM products ${where} ORDER BY stock ASC LIMIT 50`).all();
  const stats = {
    total: (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c,
    low:   (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock > 0 AND stock < 50').get() as { c: number }).c,
    out:   (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock = 0').get() as { c: number }).c,
    ok:    (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock >= 50').get() as { c: number }).c,
  };
  const logs = db.prepare(`
    SELECT il.*, p.name as product_name, p.sku FROM inventory_logs il
    JOIN products p ON il.product_id=p.id ORDER BY il.created_at DESC LIMIT 20
  `).all();
  return NextResponse.json({ products, stats, logs });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const { product_id, type, quantity, note } = await req.json();
  db.prepare(`INSERT INTO inventory_logs (product_id, type, quantity, note) VALUES (?,?,?,?)`).run(product_id, type, quantity, note ?? '');
  const delta = type === 'in' ? quantity : type === 'out' ? -quantity : quantity;
  db.prepare(`UPDATE products SET stock = stock + ?, updated_at=datetime('now') WHERE id=?`).run(delta, product_id);
  return NextResponse.json({ ok: true });
}
