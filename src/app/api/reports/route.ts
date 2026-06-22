import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET() {
  const db = getDb();
  seedIfEmpty();

  const revenueByChannel = db.prepare(`
    SELECT s.channel, SUM(o.total) as revenue, COUNT(o.id) as orders
    FROM orders o JOIN shops s ON o.shop_id=s.id
    WHERE o.status != 'cancelled' GROUP BY s.channel
  `).all();

  const topProducts = db.prepare(`
    SELECT p.name, p.sku, p.category, SUM(oi.quantity) as sold, SUM(oi.total) as revenue
    FROM order_items oi JOIN products p ON oi.product_id=p.id
    GROUP BY oi.product_id ORDER BY sold DESC LIMIT 10
  `).all();

  const dailyStats = db.prepare(`
    SELECT date, channel, gmv, orders FROM daily_stats ORDER BY date, channel
  `).all();

  const summary = {
    totalRevenue: (db.prepare("SELECT COALESCE(SUM(total),0) as r FROM orders WHERE status!='cancelled'").get() as { r: number }).r,
    totalOrders:  (db.prepare("SELECT COUNT(*) as c FROM orders WHERE status!='cancelled'").get() as { c: number }).c,
    totalProducts:(db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c,
    totalShops:   (db.prepare("SELECT COUNT(*) as c FROM shops WHERE status='active'").get() as { c: number }).c,
  };

  return NextResponse.json({ revenueByChannel, topProducts, dailyStats, summary });
}
