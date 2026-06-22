import { ChannelAdapter, ChannelId, OAuthChannelAdapter } from './types';
import { MockAdapter } from './mock-adapter';
import { TikTokAdapter } from './tiktok-adapter';
import { ShopeeAdapter } from './shopee-adapter';
import { getTikTokConfig, getShopeeConfig } from './config';

// Mock fallbacks — always available so the app runs without credentials.
const MOCKS: Record<ChannelId, ChannelAdapter> = {
  tiktok:   new MockAdapter('tiktok',   'TikTok Shop',    'https://auth.tiktok-shops.com/oauth/authorize'),
  shopee:   new MockAdapter('shopee',   'Shopee',         'https://partner.shopeemobile.com/api/v2/shop/auth_partner'),
  lazada:   new MockAdapter('lazada',   'Lazada',         'https://auth.lazada.com/oauth/authorize'),
  tiki:     new MockAdapter('tiki',     'Tiki',           'https://api.tiki.vn/sc/oauth2/auth'),
  facebook: new MockAdapter('facebook', 'Facebook Shop',  'https://www.facebook.com/v18.0/dialog/oauth'),
  website:  new MockAdapter('website',  'Website',        'https://your-site.example.com/oauth/authorize', 0.04),
};

// Resolve the adapter for a channel: REAL when developer credentials are
// configured in env, otherwise the mock. Real adapters are constructed
// per-call (cheap) so credential changes take effect without restart logic.
export function getAdapter(channel: ChannelId): ChannelAdapter | undefined {
  if (channel === 'tiktok') {
    const cfg = getTikTokConfig();
    if (cfg) return new TikTokAdapter(cfg);
  }
  if (channel === 'shopee') {
    const cfg = getShopeeConfig();
    if (cfg) return new ShopeeAdapter(cfg);
  }
  return MOCKS[channel];
}

// Returns the adapter only if it's a real OAuth-backed integration.
export function getOAuthAdapter(channel: ChannelId): OAuthChannelAdapter | null {
  const a = getAdapter(channel);
  return a && (a as OAuthChannelAdapter).isReal ? (a as OAuthChannelAdapter) : null;
}

export function allAdapters(): ChannelAdapter[] {
  return (Object.keys(MOCKS) as ChannelId[]).map(c => getAdapter(c)!).filter(Boolean);
}
