import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAdapter } from '@/lib/channels/registry';
import { syncAllShops } from '@/lib/channels/sync-engine';
import { logSync } from '@/lib/channels/sync-engine';
import { ChannelId } from '@/lib/channels/types';

// Sync one shop (by id) or all active shops with their channel platform.
// Body: { shopId?: number }
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { shopId } = body as { shopId?: number };

  if (!shopId) {
    const results = await syncAllShops();
    return NextResponse.json({ results, total: results.length });
  }

  const db = getDb();
  const shop = db.prepare('SELECT id, name, channel FROM shops WHERE id=?').get(shopId) as
    | { id: number; name: string; channel: ChannelId } | undefined;
  if (!shop) return NextResponse.json({ error: 'Shop không tồn tại' }, { status: 404 });

  const adapter = getAdapter(shop.channel);
  if (!adapter) return NextResponse.json({ error: 'Kênh không hỗ trợ' }, { status: 400 });

  const r = await adapter.syncShop(shop.name, {});
  db.prepare('UPDATE shops SET status=? WHERE id=?').run(r.status === 'error' ? 'error' : 'active', shop.id);
  logSync({ type: 'pull', channel: shop.channel, shopName: shop.name, status: r.status, message: r.message });

  return NextResponse.json({ results: [r], total: 1 });
}
