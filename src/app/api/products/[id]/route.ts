import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const product = db.prepare(`
    SELECT p.*, COALESCE(p.sale_price,0) as sale_price,
      (SELECT GROUP_CONCAT(DISTINCT s.channel) FROM listings l JOIN shops s ON l.shop_id=s.id WHERE l.product_id=p.id) as channels
    FROM products p WHERE p.id=?
  `).get(id);
  if (!product) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const listings = db.prepare(`
    SELECT l.*, s.name as shop_name, s.channel FROM listings l JOIN shops s ON l.shop_id=s.id WHERE l.product_id=?
  `).all(id);
  const logs = db.prepare(`SELECT * FROM inventory_logs WHERE product_id=? ORDER BY created_at DESC LIMIT 20`).all(id);
  return NextResponse.json({ product, listings, logs });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();
  const { name, category, description, price, cost_price, sale_price, stock, weight, status, image_url } = body;
  db.prepare(`
    UPDATE products SET name=?, category=?, description=?, price=?, cost_price=?, sale_price=?, stock=?, weight=?, status=?, image_url=?, updated_at=datetime('now') WHERE id=?
  `).run(name, category, description ?? '', price, cost_price ?? 0, sale_price ?? 0, stock, weight ?? 0, status, image_url ?? '', id);
  return NextResponse.json({ ok: true });
}

// Partial update — only fields provided
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json() as Record<string, unknown>;
  const allowed = ['name','category','description','price','cost_price','sale_price','stock','weight','status'];
  const fields = Object.keys(body).filter(k => allowed.includes(k));
  if (fields.length === 0) return NextResponse.json({ ok: true });
  const setClause = fields.map(f => `${f}=?`).join(', ');
  const values = fields.map(f => body[f]);
  db.prepare(`UPDATE products SET ${setClause}, updated_at=datetime('now') WHERE id=?`).run(...values, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  db.prepare('DELETE FROM listings WHERE product_id=?').run(id);
  db.prepare('DELETE FROM inventory_logs WHERE product_id=?').run(id);
  db.prepare('DELETE FROM products WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
