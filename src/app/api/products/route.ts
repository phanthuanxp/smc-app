import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET(req: NextRequest) {
  const db = getDb();
  seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const status   = searchParams.get('status') ?? '';
  const page     = parseInt(searchParams.get('page') ?? '1');
  const limit    = 20;
  const offset   = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (q)        { where += ' AND (p.name LIKE ? OR p.sku LIKE ?)'; params.push(`%${q}%`, `%${q}%`); }
  if (category) { where += ' AND p.category=?'; params.push(category); }
  if (status)   { where += ' AND p.status=?'; params.push(status); }

  const products = db.prepare(`
    SELECT p.*,
      (SELECT GROUP_CONCAT(DISTINCT s.channel) FROM listings l JOIN shops s ON l.shop_id=s.id WHERE l.product_id=p.id AND l.status='active') as channels,
      (SELECT COUNT(*) FROM listings WHERE product_id=p.id AND status='active') as listing_count
    FROM products p ${where} ORDER BY p.id DESC LIMIT ? OFFSET ?
  `).all(...params, limit, offset);

  const total = (db.prepare(`SELECT COUNT(*) as c FROM products p ${where}`).get(...params) as { c: number }).c;
  const categories = (db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all() as { category: string }[]).map(r => r.category);

  return NextResponse.json({ products, total, page, categories });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { sku, name, category, description, price, cost_price, stock, weight } = body;
  try {
    const result = db.prepare(`
      INSERT INTO products (sku, name, category, description, price, cost_price, stock, weight)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sku, name, category, description ?? '', price, cost_price ?? 0, stock ?? 0, weight ?? 0);
    return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
