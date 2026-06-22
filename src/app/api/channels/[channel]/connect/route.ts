import { NextRequest, NextResponse } from 'next/server';
import { getOAuthAdapter } from '@/lib/channels/registry';
import { isConfigured, APP_BASE_URL } from '@/lib/channels/config';
import { ChannelId } from '@/lib/channels/types';

// Start the OAuth connect flow: returns the platform consent URL.
// GET /api/channels/tiktok/connect  → { authUrl }  (or 503 if not configured)
export async function GET(_: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;

  if (!isConfigured(ch)) {
    return NextResponse.json({
      error: `Chưa cấu hình credential cho ${ch}. Thêm App Key/Secret vào .env.local rồi khởi động lại.`,
      configRequired: true,
    }, { status: 503 });
  }

  const adapter = getOAuthAdapter(ch);
  if (!adapter) return NextResponse.json({ error: 'Kênh không hỗ trợ OAuth' }, { status: 400 });

  const redirectUri = `${APP_BASE_URL}/api/channels/${ch}/callback`;
  return NextResponse.json({ authUrl: adapter.getAuthUrl(redirectUri) });
}
