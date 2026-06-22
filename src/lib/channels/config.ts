import { ChannelId } from './types';

// Reads developer-app credentials from the environment.
// When a channel's credentials are present, the registry uses the REAL
// adapter; otherwise it falls back to the MockAdapter so the app still runs.

export interface TikTokConfig { appKey: string; appSecret: string; }
export interface ShopeeConfig { partnerId: string; partnerKey: string; }

export function getTikTokConfig(): TikTokConfig | null {
  const appKey = process.env.TIKTOK_APP_KEY;
  const appSecret = process.env.TIKTOK_APP_SECRET;
  return appKey && appSecret ? { appKey, appSecret } : null;
}

export function getShopeeConfig(): ShopeeConfig | null {
  const partnerId = process.env.SHOPEE_PARTNER_ID;
  const partnerKey = process.env.SHOPEE_PARTNER_KEY;
  return partnerId && partnerKey ? { partnerId, partnerKey } : null;
}

// Use Shopee/TikTok sandbox hosts when SHOP_ENV=sandbox.
export const IS_SANDBOX = process.env.SHOP_ENV === 'sandbox';

export const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

export function isConfigured(channel: ChannelId): boolean {
  if (channel === 'tiktok') return !!getTikTokConfig();
  if (channel === 'shopee') return !!getShopeeConfig();
  return false;
}
