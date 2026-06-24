import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

function calcSeoScore(name: string, description: string, salePrice: number): number {
  let score = 20;
  const len = (name ?? '').length;
  if (len >= 40 && len <= 80) score += 30;
  else if (len >= 20) score += 18;
  else if (len > 0) score += 8;
  if (description && description.trim().length > 0) score += 25;
  if (description && description.trim().length > 100) score += 15;
  const kw = ['chính hãng', 'cao cấp', 'chất lượng', 'giảm giá', 'sale', 'mới', 'hot', 'best', 'free ship', 'freeship'];
  if (kw.some(k => (name + description).toLowerCase().includes(k))) score += 10;
  if (salePrice > 0) score += 10;
  return Math.min(100, score);
}

const SORT_MAP: Record<string, string> = {
  newest: 'p.id DESC',
  price_asc: 'p.price ASC',
  price_desc: 'p.price DESC',
  stock_asc: 'p.stock ASC',
  stock_desc: 'p.stock DESC',
  name: 'p.name ASC',
};

export async function GET(req: NextRequest) {
  const db = getDb();
  seedIfEmpty();
  const { searchParams } = new URL(req.url);
  const q        = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const status   = searchParams.get('status') ?? '';
  const channel  = searchParams.get('channel') ?? '';
  const stock    = searchParams.get('stock') ?? '';   // low | out | ok
  const sort     = searchParams.get('sort') ?? 'newest';
  const page     = parseInt(searchParams.get('page') ?? '1');
  const limit    = 20;
  const offset   = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params: unknown[] = [];
  if (q)        { where += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.description LIKE ?)'; params.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  if (category) { where += ' AND p.category=?'; params.push(category); }
  if (status)   { where += ' AND p.status=?'; params.push(status); }
  if (stock === 'out')  { where += ' AND p.stock=0'; }
  if (stock === 'low')  { where += ' AND p.stock>0 AND p.stock<50'; }
  if (stock === 'ok')   { where += ' AND p.stock>=50'; }
  if (channel)  { where += ' AND EXISTS (SELECT 1 FROM listings l JOIN shops s ON l.shop_id=s.id WHERE l.product_id=p.id AND s.channel=? AND l.status=\'active\')'; params.push(channel); }

  const orderBy = SORT_MAP[sort] ?? 'p.id DESC';

  const rows = db.prepare(`
    SELECT p.*,
      COALESCE(p.sale_price, 0) as sale_price,
      (SELECT GROUP_CONCAT(DISTINCT s.channel) FROM listings l JOIN shops s ON l.shop_id=s.id WHERE l.product_id=p.id AND l.status='active') as channels,
      (SELECT COUNT(*) FROM listings WHERE product_id=p.id AND status='active') as listing_count,
      (SELECT COALESCE(SUM(l.views),0) FROM listings l WHERE l.product_id=p.id) as total_views,
      (SELECT COALESCE(SUM(l.sales),0) FROM listings l WHERE l.product_id=p.id) as total_sales
    FROM products p ${where} ORDER BY ${orderBy} LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as {
    id: number; sku: string; name: string; category: string; description: string;
    price: number; cost_price: number; sale_price: number; stock: number; weight: number;
    status: string; channels: string | null; listing_count: number; total_views: number; total_sales: number;
  }[];

  const products = rows.map(p => ({
    ...p,
    seo_score: calcSeoScore(p.name, p.description ?? '', p.sale_price),
    profit_margin: p.price > 0 ? Math.round(((p.price - p.cost_price) / p.price) * 100) : 0,
  }));

  const total = (db.prepare(`SELECT COUNT(*) as c FROM products p ${where}`).get(...params) as { c: number }).c;
  const categories = (db.prepare('SELECT DISTINCT category FROM products ORDER BY category').all() as { category: string }[]).map(r => r.category);

  // Summary stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN stock=0 THEN 1 ELSE 0 END) as out_of_stock,
      SUM(CASE WHEN stock>0 AND stock<50 THEN 1 ELSE 0 END) as low_stock
    FROM products
  `).get() as { total: number; active: number; out_of_stock: number; low_stock: number };

  return NextResponse.json({ products, total, page, categories, stats });
}

export async function POST(req: NextRequest) {
  const db = getDb();
  const body = await req.json();
  const { sku, name, category, description, price, cost_price, sale_price, stock, weight, status, image_url } = body;
  if (!sku || !name || !price) return NextResponse.json({ error: 'Thiếu sku, name hoặc price' }, { status: 400 });
  try {
    const result = db.prepare(`
      INSERT INTO products (sku, name, category, description, price, cost_price, sale_price, stock, weight, status, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(sku, name, category ?? '', description ?? '', price, cost_price ?? 0, sale_price ?? 0, stock ?? 0, weight ?? 0, status ?? 'active', image_url ?? '');
    return NextResponse.json({ ok: true, id: result.lastInsertRowid }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
