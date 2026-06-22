import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET() {
  const db = getDb();
  seedIfEmpty();

  const shops    = (db.prepare("SELECT COUNT(*) as c FROM shops WHERE status='active'").get() as { c: number }).c;
  const products = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  const todayOrders = (db.prepare("SELECT COUNT(*) as c FROM orders WHERE date(created_at)=date('now')").get() as { c: number }).c;
  const todayRevenue = (db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE date(created_at)=date('now') AND status!='cancelled'").get() as { r: number }).r;
  const lowStock = (db.prepare('SELECT COUNT(*) as c FROM products WHERE stock > 0 AND stock < 50').get() as { c: number }).c;
  const errorListings = (db.prepare("SELECT COUNT(*) as c FROM listings WHERE status IN ('error','pending','rejected')").get() as { c: number }).c;

  const recentOrders = db.prepare(`
    SELECT o.*, s.channel, s.name as shop_name
    FROM orders o JOIN shops s ON o.shop_id = s.id
    ORDER BY o.created_at DESC LIMIT 5
  `).all();

  const topProducts = db.prepare(`
    SELECT p.*,
      (SELECT GROUP_CONCAT(s.channel) FROM listings l JOIN shops s ON l.shop_id=s.id WHERE l.product_id=p.id AND l.status='active') as channels
    FROM products p ORDER BY p.id LIMIT 6
  `).all();

  const stats = db.prepare(`
    SELECT channel, SUM(gmv) as gmv, SUM(orders) as orders
    FROM daily_stats GROUP BY channel
  `).all();

  const trends = db.prepare(`SELECT * FROM market_trends ORDER BY score DESC LIMIT 8`).all();

  const channelCounts = db.prepare(`
    SELECT channel, COUNT(*) as count FROM shops WHERE status='active' GROUP BY channel
  `).all() as { channel: string; count: number }[];

  const dailyStats = db.prepare(`
    SELECT date, channel, gmv, orders FROM daily_stats ORDER BY date ASC
  `).all();

  return NextResponse.json({
    kpis: { shops, products, todayOrders, todayRevenue, lowStock, errorListings },
    recentOrders,
    topProducts,
    stats,
    trends,
    channelCounts,
    dailyStats,
  });
}
