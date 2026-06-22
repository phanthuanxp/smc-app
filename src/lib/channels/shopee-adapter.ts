import {
  OAuthChannelAdapter, ChannelCredentials, ProductPayload,
  PublishResult, SyncResult, StockUpdateResult, OAuthTokens,
} from './types';
import { ShopeeConfig, IS_SANDBOX } from './config';
import { shopeeSign } from './signing';

// Real Shopee Open Platform v2 adapter.
// Docs: https://open.shopee.com/documents
const HOST = IS_SANDBOX
  ? 'https://partner.test-stable.shopeemobile.com'
  : 'https://partner.shopeemobile.com';

export class ShopeeAdapter implements OAuthChannelAdapter {
  readonly id = 'shopee' as const;
  readonly label = 'Shopee';
  readonly isReal = true as const;

  constructor(private cfg: ShopeeConfig) {}

  // Consent URL the shop owner visits to authorize our app.
  getAuthUrl(redirectUri: string): string {
    const path = '/api/v2/shop/auth_partner';
    const ts = Math.floor(Date.now() / 1000);
    const sign = shopeeSign(this.cfg.partnerKey, this.cfg.partnerId, path, ts);
    const params = new URLSearchParams({
      partner_id: this.cfg.partnerId,
      timestamp: String(ts),
      sign,
      redirect: redirectUri,
    });
    return `${HOST}${path}?${params.toString()}`;
  }

  // Exchange the `code` (+ shop_id) from the redirect for access/refresh tokens.
  async exchangeCode(code: string, shopId?: string): Promise<OAuthTokens> {
    const path = '/api/v2/auth/token/get';
    const ts = Math.floor(Date.now() / 1000);
    const sign = shopeeSign(this.cfg.partnerKey, this.cfg.partnerId, path, ts);
    const url = `${HOST}${path}?partner_id=${this.cfg.partnerId}&timestamp=${ts}&sign=${sign}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, shop_id: Number(shopId), partner_id: Number(this.cfg.partnerId) }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Shopee token: ${data.error} ${data.message ?? ''}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expire_in ?? 14400) * 1000).toISOString(),
      externalShopId: shopId,
    };
  }

  async refreshAccessToken(refreshToken: string, shopId?: string): Promise<OAuthTokens> {
    const path = '/api/v2/auth/access_token/get';
    const ts = Math.floor(Date.now() / 1000);
    const sign = shopeeSign(this.cfg.partnerKey, this.cfg.partnerId, path, ts);
    const url = `${HOST}${path}?partner_id=${this.cfg.partnerId}&timestamp=${ts}&sign=${sign}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, shop_id: Number(shopId), partner_id: Number(this.cfg.partnerId) }),
    });
    const data = await res.json();
    if (data.error) throw new Error(`Shopee refresh: ${data.error}`);
    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresAt: new Date(Date.now() + (data.expire_in ?? 14400) * 1000).toISOString(),
      externalShopId: shopId,
    };
  }

  // Helper for authenticated shop-level calls.
  private async call(apiPath: string, creds: ChannelCredentials, body: Record<string, unknown>) {
    const ts = Math.floor(Date.now() / 1000);
    const sign = shopeeSign(this.cfg.partnerKey, this.cfg.partnerId, apiPath, ts, creds.accessToken, creds.shopId);
    const url = `${HOST}${apiPath}?partner_id=${this.cfg.partnerId}&timestamp=${ts}&sign=${sign}&access_token=${creds.accessToken}&shop_id=${creds.shopId}`;
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    return res.json();
  }

  async publishProduct(shopName: string, product: ProductPayload, creds: ChannelCredentials): Promise<PublishResult> {
    try {
      const data = await this.call('/api/v2/product/add_item', creds, {
        item_name: product.name,
        description: product.description ?? product.name,
        original_price: product.price,
        normal_stock: product.stock,
      });
      if (data.error) return { channel: this.id, shopName, status: 'error', message: data.message ?? data.error };
      return { channel: this.id, shopName, status: 'success', externalId: String(data.response?.item_id ?? ''), message: 'Đã đăng lên Shopee' };
    } catch (e) {
      return { channel: this.id, shopName, status: 'error', message: e instanceof Error ? e.message : 'Lỗi Shopee' };
    }
  }

  async syncShop(shopName: string, creds: ChannelCredentials): Promise<SyncResult> {
    try {
      const data = await this.call('/api/v2/order/get_order_list', creds, { time_range_field: 'create_time', page_size: 20 });
      if (data.error) return { channel: this.id, shopName, status: 'error', syncedAt: new Date().toISOString(), message: data.message ?? data.error };
      return { channel: this.id, shopName, status: 'success', syncedAt: new Date().toISOString(), message: 'Đồng bộ Shopee thành công' };
    } catch (e) {
      return { channel: this.id, shopName, status: 'error', syncedAt: new Date().toISOString(), message: e instanceof Error ? e.message : 'Lỗi Shopee' };
    }
  }

  async updateStock(shopName: string, sku: string, stock: number, creds: ChannelCredentials): Promise<StockUpdateResult> {
    try {
      const data = await this.call('/api/v2/product/update_stock', creds, {
        item_id: Number(creds.itemId ?? 0),
        stock_list: [{ model_id: 0, normal_stock: stock }],
      });
      if (data.error) return { channel: this.id, shopName, sku, newStock: stock, status: 'error', message: data.message ?? data.error };
      return { channel: this.id, shopName, sku, newStock: stock, status: 'success', message: `Shopee: tồn ${sku} = ${stock}` };
    } catch (e) {
      return { channel: this.id, shopName, sku, newStock: stock, status: 'error', message: e instanceof Error ? e.message : 'Lỗi Shopee' };
    }
  }
}
