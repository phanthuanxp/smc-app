import {
  OAuthChannelAdapter, ChannelCredentials, ProductPayload,
  PublishResult, SyncResult, StockUpdateResult, OAuthTokens,
} from './types';
import { TikTokConfig } from './config';
import { tiktokSign } from './signing';

// Real TikTok Shop Open API adapter.
// Docs: https://partner.tiktokshop.com/docv2
const AUTH_HOST = 'https://auth.tiktok-shops.com';
const API_HOST = 'https://open-api.tiktokglobalshop.com';

export class TikTokAdapter implements OAuthChannelAdapter {
  readonly id = 'tiktok' as const;
  readonly label = 'TikTok Shop';
  readonly isReal = true as const;

  constructor(private cfg: TikTokConfig) {}

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      app_key: this.cfg.appKey,
      state: Math.random().toString(36).slice(2),
      redirect_uri: redirectUri,
    });
    return `${AUTH_HOST}/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<OAuthTokens> {
    const url = `${AUTH_HOST}/api/v2/token/get?app_key=${this.cfg.appKey}&app_secret=${this.cfg.appSecret}&auth_code=${code}&grant_type=authorized_code`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 0) throw new Error(`TikTok token: ${data.message}`);
    const d = data.data;
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresAt: new Date(d.access_token_expire_in * 1000).toISOString(),
      externalShopId: d.seller_name,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
    const url = `${AUTH_HOST}/api/v2/token/refresh?app_key=${this.cfg.appKey}&app_secret=${this.cfg.appSecret}&refresh_token=${refreshToken}&grant_type=refresh_token`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 0) throw new Error(`TikTok refresh: ${data.message}`);
    const d = data.data;
    return {
      accessToken: d.access_token,
      refreshToken: d.refresh_token,
      expiresAt: new Date(d.access_token_expire_in * 1000).toISOString(),
    };
  }

  // Authenticated signed call to the open API.
  private async call(path: string, creds: ChannelCredentials, body: Record<string, unknown>) {
    const ts = Math.floor(Date.now() / 1000);
    const query: Record<string, string | number> = {
      app_key: this.cfg.appKey,
      shop_cipher: creds.shopCipher ?? '',
      timestamp: ts,
    };
    const bodyStr = JSON.stringify(body);
    const sign = tiktokSign(this.cfg.appSecret, path, query, bodyStr);
    const qs = new URLSearchParams({ ...Object.fromEntries(Object.entries(query).map(([k, v]) => [k, String(v)])), sign });
    const res = await fetch(`${API_HOST}${path}?${qs.toString()}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-tts-access-token': creds.accessToken ?? '' },
      body: bodyStr,
    });
    return res.json();
  }

  async publishProduct(shopName: string, product: ProductPayload, creds: ChannelCredentials): Promise<PublishResult> {
    try {
      const data = await this.call('/product/202309/products', creds, {
        title: product.name,
        description: product.description ?? product.name,
        skus: [{ price: { amount: String(product.price), currency: 'VND' }, inventory: [{ quantity: product.stock }] }],
      });
      if (data.code !== 0) return { channel: this.id, shopName, status: 'error', message: data.message };
      return { channel: this.id, shopName, status: 'success', externalId: String(data.data?.product_id ?? ''), message: 'Đã đăng lên TikTok Shop' };
    } catch (e) {
      return { channel: this.id, shopName, status: 'error', message: e instanceof Error ? e.message : 'Lỗi TikTok' };
    }
  }

  async syncShop(shopName: string, creds: ChannelCredentials): Promise<SyncResult> {
    try {
      const data = await this.call('/order/202309/orders/search', creds, { page_size: 20 });
      if (data.code !== 0) return { channel: this.id, shopName, status: 'error', syncedAt: new Date().toISOString(), message: data.message };
      return { channel: this.id, shopName, status: 'success', syncedAt: new Date().toISOString(), message: 'Đồng bộ TikTok Shop thành công' };
    } catch (e) {
      return { channel: this.id, shopName, status: 'error', syncedAt: new Date().toISOString(), message: e instanceof Error ? e.message : 'Lỗi TikTok' };
    }
  }

  async updateStock(shopName: string, sku: string, stock: number, creds: ChannelCredentials): Promise<StockUpdateResult> {
    try {
      const data = await this.call(`/product/202309/products/${creds.productId ?? ''}/inventory/update`, creds, {
        skus: [{ id: creds.skuId ?? '', inventory: [{ warehouse_id: creds.warehouseId ?? '', quantity: stock }] }],
      });
      if (data.code !== 0) return { channel: this.id, shopName, sku, newStock: stock, status: 'error', message: data.message };
      return { channel: this.id, shopName, sku, newStock: stock, status: 'success', message: `TikTok: tồn ${sku} = ${stock}` };
    } catch (e) {
      return { channel: this.id, shopName, sku, newStock: stock, status: 'error', message: e instanceof Error ? e.message : 'Lỗi TikTok' };
    }
  }
}
