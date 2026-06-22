// ─────────────────────────────────────────────────────────────
// Channel adapter contract.
// Every marketplace (TikTok, Shopee, Lazada, Tiki, Facebook, Website)
// implements this interface. Today they are backed by MockAdapter;
// swapping in a real integration means implementing these methods
// against the platform's Open API + OAuth — no caller changes needed.
// ─────────────────────────────────────────────────────────────

export type ChannelId = 'tiktok' | 'shopee' | 'lazada' | 'tiki' | 'facebook' | 'website';

export interface ChannelCredentials {
  // Real adapters read these from the shop's stored OAuth tokens.
  accessToken?: string;
  refreshToken?: string;
  shopId?: string;
  [k: string]: string | undefined;
}

export interface ProductPayload {
  sku: string;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category?: string;
  images?: string[];
}

export interface PublishResult {
  channel: ChannelId;
  shopName: string;
  status: 'success' | 'error' | 'pending';
  externalId?: string;
  message?: string;
}

export interface SyncResult {
  channel: ChannelId;
  shopName: string;
  status: 'success' | 'error';
  syncedAt: string;
  message?: string;
}

export interface StockUpdateResult {
  channel: ChannelId;
  shopName: string;
  sku: string;
  newStock: number;
  status: 'success' | 'error';
  message?: string;
}

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;        // ISO timestamp
  externalShopId?: string;
}

// Real (OAuth-backed) adapters additionally implement token exchange/refresh.
export interface OAuthChannelAdapter extends ChannelAdapter {
  readonly isReal: true;
  exchangeCode(code: string, shopId?: string): Promise<OAuthTokens>;
  refreshAccessToken(refreshToken: string, shopId?: string): Promise<OAuthTokens>;
}

export interface ChannelAdapter {
  readonly id: ChannelId;
  readonly label: string;
  /** OAuth authorize URL (real adapters return the platform consent screen). */
  getAuthUrl(redirectUri: string): string;
  /** Publish/create a listing for a product on a given shop. */
  publishProduct(
    shopName: string,
    product: ProductPayload,
    creds: ChannelCredentials
  ): Promise<PublishResult>;
  /** Pull latest stock/price/orders from the platform into our DB. */
  syncShop(shopName: string, creds: ChannelCredentials): Promise<SyncResult>;
  /** Push a new stock level for a SKU to the platform (anti-oversell). */
  updateStock(
    shopName: string,
    sku: string,
    stock: number,
    creds: ChannelCredentials
  ): Promise<StockUpdateResult>;
}
