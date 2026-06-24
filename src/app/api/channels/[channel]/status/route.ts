import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { isConfigured } from '@/lib/channels/config';
import { ChannelId } from '@/lib/channels/types';

// GET /api/channels/tiktok/status
// Returns whether the channel is configured + shop stats
export async function GET(_: NextRequest, { params }: { params: Promise<{ channel: string }> }) {
  const { channel } = await params;
  const ch = channel as ChannelId;
  const configured = isConfigured(ch);

  const db = getDb();
  const shops = db.prepare(
    `SELECT COUNT(*) as total,
      SUM(CASE WHEN status='active' THEN 1 ELSE 0 END) as active,
      SUM(CASE WHEN token_expires_at IS NOT NULL AND token_expires_at > datetime('now') THEN 1 ELSE 0 END) as token_valid
     FROM shops WHERE channel=?`
  ).get(ch) as { total: number; active: number; token_valid: number };

  const setupSteps: Record<string, { title: string; steps: string[] }> = {
    tiktok: {
      title: 'Cấu hình TikTok Shop Open API',
      steps: [
        'Truy cập https://partner.tiktokshop.com → Đăng nhập tài khoản Seller',
        'Vào "App Management" → Tạo app mới → Chọn loại "Web App"',
        'Điền thông tin app, Redirect URI: {APP_BASE_URL}/api/channels/tiktok/callback',
        'Lấy App Key và App Secret sau khi app được duyệt',
        'Thêm vào file .env.local: TIKTOK_APP_KEY=... và TIKTOK_APP_SECRET=...',
        'Restart server: npm run dev',
      ],
    },
    shopee: {
      title: 'Cấu hình Shopee Open Platform',
      steps: [
        'Truy cập https://open.shopee.com → Đăng nhập tài khoản Seller/Partner',
        'Vào "My Apps" → Tạo app mới → Chọn "Self-developed"',
        'Điền thông tin app, Redirect URL: {APP_BASE_URL}/api/channels/shopee/callback',
        'Lấy Partner ID và Partner Key từ app dashboard',
        'Thêm vào file .env.local: SHOPEE_PARTNER_ID=... và SHOPEE_PARTNER_KEY=...',
        'Restart server: npm run dev',
      ],
    },
  };

  return NextResponse.json({
    configured,
    channel: ch,
    shops: { total: shops.total ?? 0, active: shops.active ?? 0, tokenValid: shops.token_valid ?? 0 },
    setup: setupSteps[ch] ?? null,
  });
}
