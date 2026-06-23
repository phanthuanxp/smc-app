import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getOAuthAdapter } from '@/lib/channels/registry';
import { ChannelId } from '@/lib/channels/types';

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const shop = db.prepare('SELECT * FROM shops WHERE id=?').get(id) as {
    id: number; channel: string; refresh_token: string | null; external_shop_id: string | null;
  } | undefined;

  if (!shop) return NextResponse.json({ error: 'Shop not found' }, { status: 404 });
  if (!shop.refresh_token) return NextResponse.json({ error: 'Không có refresh token' }, { status: 400 });

  const adapter = getOAuthAdapter(shop.channel as ChannelId);
  if (!adapter) return NextResponse.json({ error: 'Kênh không hỗ trợ OAuth' }, { status: 400 });

  try {
    const tokens = await adapter.refreshAccessToken(shop.refresh_token, shop.external_shop_id ?? undefined);
    db.prepare('UPDATE shops SET access_token=?, refresh_token=?, token_expires_at=?, status=? WHERE id=?')
      .run(tokens.accessToken, tokens.refreshToken ?? shop.refresh_token, tokens.expiresAt, 'active', id);
    return NextResponse.json({ ok: true, expiresAt: tokens.expiresAt });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Lỗi refresh token' }, { status: 500 });
  }
}
