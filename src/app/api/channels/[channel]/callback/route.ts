import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOAuthAdapter } from '@/lib/channels/registry';
import { ChannelId } from '@/lib/channels/types';

// OAuth redirect target. Platforms send ?code=... (& shop_id for Shopee).
// We exchange for tokens, store them on the shop row, then redirect to /shops.
export async function GET(req: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const shopId = searchParams.get('shop_id') ?? undefined; // Shopee sends this

  const adapter = getOAuthAdapter(ch);
  if (!adapter) return NextResponse.redirect(new URL('/shops?error=unsupported', req.url));
  if (!code) return NextResponse.redirect(new URL('/shops?error=missing_code', req.url));

  try {
    const tokens = await adapter.exchangeCode(code, shopId);
    const db = getDb();
    const extId = tokens.externalShopId ?? shopId ?? '';
    const name = `${adapter.label} (${extId || 'đã kết nối'})`;

    // Upsert by external_shop_id within this channel.
    const existing = extId
      ? db.prepare('SELECT id FROM shops WHERE channel=? AND external_shop_id=?').get(ch, extId) as { id: number } | undefined
      : undefined;

    if (existing) {
      db.prepare('UPDATE shops SET access_token=?, refresh_token=?, token_expires_at=?, status=? WHERE id=?')
        .run(tokens.accessToken, tokens.refreshToken, tokens.expiresAt, 'active', existing.id);
    } else {
      db.prepare(`INSERT INTO shops (name, channel, status, external_shop_id, access_token, refresh_token, token_expires_at)
                  VALUES (?,?,?,?,?,?,?)`)
        .run(name, ch, 'active', extId, tokens.accessToken, tokens.refreshToken, tokens.expiresAt);
    }
    return NextResponse.redirect(new URL('/shops?connected=' + ch, req.url));
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : 'exchange_failed');
    return NextResponse.redirect(new URL('/shops?error=' + msg, req.url));
  }
}
