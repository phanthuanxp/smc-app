import {
  ChannelAdapter, ChannelId, ChannelCredentials, ProductPayload, PublishResult, SyncResult, StockUpdateResult,
} from './types';

// A configurable mock that imitates a real channel integration:
// network latency, OAuth URL shape, and an occasional failure so the
// UI's error handling is exercised. Replace per-channel with a real
// adapter that calls the platform Open API.
export class MockAdapter implements ChannelAdapter {
  constructor(
    public readonly id: ChannelId,
    public readonly label: string,
    private readonly authBase: string,
    private readonly failureRate = 0.12,
  ) {}

  getAuthUrl(redirectUri: string): string {
    const params = new URLSearchParams({
      client_id: `mock-${this.id}-client`,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'product.read product.write order.read',
      state: Math.random().toString(36).slice(2),
    });
    return `${this.authBase}?${params.toString()}`;
  }

  private async latency(min = 200, max = 700) {
    await new Promise(r => setTimeout(r, min + Math.random() * (max - min)));
  }

  async publishProduct(
    shopName: string,
    product: ProductPayload,
    _creds: ChannelCredentials,
  ): Promise<PublishResult> {
    void _creds;
    await this.latency();
    if (Math.random() < this.failureRate) {
      return {
        channel: this.id, shopName, status: 'error',
        message: `${this.label}: API trả về lỗi xác thực listing (mã 4012)`,
      };
    }
    return {
      channel: this.id, shopName, status: 'success',
      externalId: `${this.id.toUpperCase()}-${Date.now()}-${Math.floor(Math.random() * 9999)}`,
      message: `Đã đăng "${product.name}" lên ${shopName}`,
    };
  }

  async syncShop(shopName: string, _creds: ChannelCredentials): Promise<SyncResult> {
    void _creds;
    await this.latency();
    if (Math.random() < this.failureRate) {
      return {
        channel: this.id, shopName, status: 'error',
        syncedAt: new Date().toISOString(),
        message: `${this.label}: token hết hạn, cần kết nối lại`,
      };
    }
    return {
      channel: this.id, shopName, status: 'success',
      syncedAt: new Date().toISOString(),
      message: `Đồng bộ tồn kho & đơn hàng từ ${shopName} thành công`,
    };
  }

  async updateStock(
    shopName: string,
    sku: string,
    stock: number,
    _creds: ChannelCredentials,
  ): Promise<StockUpdateResult> {
    void _creds;
    await this.latency(80, 300);
    if (Math.random() < this.failureRate) {
      return {
        channel: this.id, shopName, sku, newStock: stock, status: 'error',
        message: `${this.label}: cập nhật tồn kho thất bại (retry sau)`,
      };
    }
    return {
      channel: this.id, shopName, sku, newStock: stock, status: 'success',
      message: `${this.label}: đã đặt tồn kho ${sku} = ${stock}`,
    };
  }
}
