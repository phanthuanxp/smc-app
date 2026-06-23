'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, RefreshCw, CheckCircle, XCircle, AlertCircle,
  Search, Sparkles, BarChart3, Settings, Package,
  ShoppingCart, Store, KeyRound, Clock, RotateCcw,
  Zap, TrendingUp, MessageSquare, Tag, ChevronRight, X,
} from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Shop {
  id: number; name: string; channel: string;
  status: 'active' | 'inactive' | 'error';
  product_count: number; revenue: number; orders: number;
  connected_at: string; last_sync_at: string | null;
  listing_count: number; token_expires_at: string | null;
}
interface Product {
  id: number; sku: string; name: string; category: string;
  price: number; cost_price: number; stock: number;
  status: string; channels: string | null; listing_count: number;
  total_sales: number; seo_score: number;
}
interface Order {
  id: number; order_no: string; customer_name: string;
  shop_id: number; shop_name: string; channel: string;
  status: string; total: number; created_at: string;
}

export interface AiTool {
  id: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  prompt: string;
}

export interface PlatformConfig {
  channel: 'tiktok' | 'shopee';
  label: string;
  color: string;
  colorDark: string;
  colorLight: string;
  colorBorder: string;
  logo: React.ReactNode;
  feeDefault: number;
  platformFeatures: string[];
  aiTools: AiTool[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtMoney = (v: number) => v >= 1_000_000
  ? `${(v / 1_000_000).toFixed(1)}M đ`
  : `${Math.round(v / 1_000).toLocaleString('vi-VN')}k đ`;
const fmtTime = (s: string | null) => {
  if (!s) return '—';
  const diff = (Date.now() - new Date(s).getTime()) / 60000;
  if (diff < 60) return `${Math.round(diff)}p trước`;
  if (diff < 1440) return `${Math.round(diff / 60)}h trước`;
  return `${Math.round(diff / 1440)} ngày trước`;
};

type TokenState = 'none' | 'expired' | 'soon' | 'ok';
function tokenState(exp: string | null): TokenState {
  if (!exp) return 'none';
  const d = (new Date(exp).getTime() - Date.now()) / 86400000;
  if (d < 0) return 'expired';
  if (d < 7) return 'soon';
  return 'ok';
}
const TOKEN_LABEL: Record<TokenState, string> = {
  none: '—', expired: 'Token hết hạn', soon: 'Sắp hết hạn', ok: '',
};
const TOKEN_COLOR: Record<TokenState, string> = {
  none: '#94a3b8', expired: '#dc2626', soon: '#d97706', ok: '#16a34a',
};
const STATUS_ICON = { active: CheckCircle, inactive: XCircle, error: AlertCircle };
const STATUS_COLOR = { active: '#16a34a', inactive: '#94a3b8', error: '#dc2626' };
const STATUS_LABEL = { active: 'Đang kết nối', inactive: 'Ngừng hoạt động', error: 'Lỗi kết nối' };
const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  new:       { label: 'Mới', color: '#2563eb' },
  confirmed: { label: 'Xác nhận', color: '#7c3aed' },
  shipping:  { label: 'Đang giao', color: '#d97706' },
  delivered: { label: 'Hoàn thành', color: '#16a34a' },
  cancelled: { label: 'Huỷ', color: '#dc2626' },
};

type Tab = 'shops' | 'products' | 'orders' | 'ai' | 'analytics' | 'settings';

// ── Main component ─────────────────────────────────────────────────────────────
export default function PlatformHub({ cfg }: { cfg: PlatformConfig }) {
  const { channel, label, color, colorDark, colorLight, colorBorder, logo, feeDefault, platformFeatures, aiTools } = cfg;

  const [tab, setTab] = useState<Tab>('shops');
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingProds, setLoadingProds] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [syncing, setSyncing] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [prodQ, setProdQ] = useState('');
  const [orderQ, setOrderQ] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ toolId: string; text: string } | null>(null);
  const [fee, setFee] = useState(feeDefault);
  const [vat, setVat] = useState(10);
  const [connectOpen, setConnectOpen] = useState(false);
  const [selectedShop, setSelectedShop] = useState<number | null>(null);

  const loadShops = useCallback(async () => {
    setLoadingShops(true);
    const r = await fetch(`/api/shops?channel=${channel}`);
    const d = await r.json();
    setShops(d.shops ?? []);
    setLoadingShops(false);
  }, [channel]);

  const loadProducts = useCallback(async () => {
    setLoadingProds(true);
    const q = prodQ ? `&q=${encodeURIComponent(prodQ)}` : '';
    const shop = selectedShop ? `&shop_id=${selectedShop}` : '';
    const r = await fetch(`/api/products?channel=${channel}${q}${shop}&limit=30`);
    const d = await r.json();
    setProducts(d.products ?? []);
    setLoadingProds(false);
  }, [channel, prodQ, selectedShop]);

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    const q = orderQ ? `&q=${encodeURIComponent(orderQ)}` : '';
    const st = orderStatus ? `&status=${orderStatus}` : '';
    const r = await fetch(`/api/orders?channel=${channel}${q}${st}`);
    const d = await r.json();
    setOrders(d.orders ?? []);
    setLoadingOrders(false);
  }, [channel, orderQ, orderStatus]);

  useEffect(() => { loadShops(); }, [loadShops]);
  useEffect(() => { if (tab === 'products') loadProducts(); }, [tab, loadProducts]);
  useEffect(() => { if (tab === 'orders') loadOrders(); }, [tab, loadOrders]);

  const syncShop = async (id: number) => {
    setSyncing(id);
    await fetch(`/api/channels/sync`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: id }) });
    await loadShops();
    setSyncing(null);
  };

  const refreshToken = async (id: number) => {
    setRefreshing(id);
    await fetch(`/api/shops/${id}/refresh`, { method: 'POST' });
    await loadShops();
    setRefreshing(null);
  };

  const connectOAuth = async () => {
    const r = await fetch(`/api/channels/${channel}/connect`);
    const d = await r.json();
    if (d.authUrl) window.location.href = d.authUrl;
  };

  const runAi = async (tool: AiTool) => {
    setAiLoading(tool.id);
    setAiResult(null);
    try {
      const r = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: tool.prompt }] }),
      });
      const d = await r.json();
      setAiResult({ toolId: tool.id, text: d.content ?? d.message ?? JSON.stringify(d) });
    } catch {
      setAiResult({ toolId: tool.id, text: 'Lỗi kết nối AI. Vui lòng kiểm tra cài đặt AI provider.' });
    }
    setAiLoading(null);
  };

  // Summary stats
  const totalRevenue = shops.reduce((s, sh) => s + sh.revenue, 0);
  const totalOrders  = shops.reduce((s, sh) => s + sh.orders, 0);
  const activeShops  = shops.filter(s => s.status === 'active').length;

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'shops',     icon: <Store size={14}/>,       label: 'Shops' },
    { id: 'products',  icon: <Tag size={14}/>,          label: 'Sản phẩm' },
    { id: 'orders',    icon: <ShoppingCart size={14}/>, label: 'Đơn hàng' },
    { id: 'ai',        icon: <Sparkles size={14}/>,     label: 'AI Hub' },
    { id: 'analytics', icon: <BarChart3 size={14}/>,    label: 'Phân tích' },
    { id: 'settings',  icon: <Settings size={14}/>,     label: 'Cài đặt' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-7 pb-10">
      {/* ── Platform Header ─────────────────────────────────────── */}
      <div
        className="rounded-[18px] p-5 mb-5 flex items-center justify-between"
        style={{ background: colorLight, border: `1px solid ${colorBorder}` }}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0"
            style={{ background: color }}>
            {logo}
          </div>
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight" style={{ color: colorDark }}>{label}</h1>
            <p className="text-[13px] mt-0.5" style={{ color }}>
              {loadingShops ? 'Đang tải...' : `${shops.length} shop kết nối · ${activeShops} đang hoạt động · Doanh thu ${fmtMoney(totalRevenue)}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-2">
            <div className="text-[13px] font-semibold" style={{ color: colorDark }}>{totalOrders.toLocaleString('vi-VN')} đơn</div>
            <div className="text-[11px]" style={{ color }}>tổng đơn hàng</div>
          </div>
          <button
            onClick={() => setConnectOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold transition-opacity hover:opacity-85"
            style={{ background: color }}
          >
            <Plus size={15}/> Thêm shop
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 p-1 rounded-[12px]" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[13px] font-medium transition-all flex-1 justify-center"
            style={tab === t.id
              ? { background: color, color: '#fff', fontWeight: 600 }
              : { color: 'var(--smc-text-3)' }}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ══════════════ TAB: SHOPS ══════════════ */}
      {tab === 'shops' && (
        <div>
          {loadingShops ? (
            <div className="text-center py-16 text-[#94a3b8]">Đang tải danh sách shop...</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: colorLight }}>
                {logo}
              </div>
              <div className="text-[16px] font-bold mb-2" style={{ color: 'var(--smc-text)' }}>Chưa có shop nào</div>
              <p className="text-[13px] mb-5" style={{ color: 'var(--smc-text-3)' }}>Kết nối {label} đầu tiên để bắt đầu quản lý</p>
              <button
                onClick={() => setConnectOpen(true)}
                className="px-6 py-2.5 rounded-[10px] text-white font-semibold"
                style={{ background: color }}
              >Kết nối {label}</button>
            </div>
          ) : (
            <div className="space-y-3">
              {shops.map(shop => {
                const ts = tokenState(shop.token_expires_at);
                const StatusIcon = STATUS_ICON[shop.status] ?? AlertCircle;
                const daysLeft = shop.token_expires_at
                  ? Math.max(0, Math.round((new Date(shop.token_expires_at).getTime() - Date.now()) / 86400000))
                  : null;
                return (
                  <div
                    key={shop.id}
                    className="rounded-[16px] p-4 flex items-center gap-4 transition-all"
                    style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', boxShadow: '0 2px 8px var(--smc-shadow)' }}
                  >
                    {/* Avatar */}
                    <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[16px] font-bold text-white"
                      style={{ background: color }}>
                      {shop.name.charAt(0).toUpperCase()}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[14px] font-bold truncate" style={{ color: 'var(--smc-text)' }}>{shop.name}</span>
                        <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: STATUS_COLOR[shop.status] }}>
                          <StatusIcon size={12}/> {STATUS_LABEL[shop.status]}
                        </span>
                        {ts === 'soon' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            ⚡ Token còn {daysLeft}n
                          </span>
                        )}
                        {ts === 'expired' && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                            Token hết hạn
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>
                        <span><Package size={11} className="inline mr-1"/>{shop.listing_count} SP</span>
                        <span><ShoppingCart size={11} className="inline mr-1"/>{shop.orders} đơn</span>
                        <span><TrendingUp size={11} className="inline mr-1"/>{fmtMoney(shop.revenue)}</span>
                        <span><Clock size={11} className="inline mr-1"/>Sync {fmtTime(shop.last_sync_at)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {(ts === 'soon' || ts === 'expired') && (
                        <button
                          onClick={() => refreshToken(shop.id)}
                          disabled={refreshing === shop.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80"
                          style={{ color: color, borderColor: colorBorder, background: colorLight }}
                        >
                          <KeyRound size={12}/>
                          {refreshing === shop.id ? 'Đang làm mới...' : 'Làm mới token'}
                        </button>
                      )}
                      <button
                        onClick={() => syncShop(shop.id)}
                        disabled={syncing === shop.id}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80"
                        style={{ color: 'var(--smc-text-2)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}
                      >
                        <RefreshCw size={12} className={syncing === shop.id ? 'animate-spin' : ''}/>
                        {syncing === shop.id ? 'Syncing...' : 'Sync'}
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add more */}
              <button
                onClick={() => setConnectOpen(true)}
                className="w-full rounded-[16px] p-4 flex items-center justify-center gap-2 text-[13px] font-medium border-2 border-dashed transition-all hover:opacity-70"
                style={{ borderColor: colorBorder, color: color }}
              >
                <Plus size={16}/> Kết nối thêm shop {label}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ══════════════ TAB: PRODUCTS ══════════════ */}
      {tab === 'products' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-[360px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--smc-text-4)' }}/>
              <input
                value={prodQ}
                onChange={e => setProdQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadProducts()}
                placeholder="Tìm sản phẩm trên sàn..."
                className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px] outline-none"
                style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}
              />
            </div>
            <select
              value={selectedShop ?? ''}
              onChange={e => setSelectedShop(e.target.value ? Number(e.target.value) : null)}
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}
            >
              <option value="">Tất cả shop</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={loadProducts} className="px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold" style={{ background: color }}>Tìm</button>
          </div>
          <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                  {['Sản phẩm', 'Danh mục', 'Giá bán', 'Tồn kho', 'Đã bán', 'SEO', 'Trạng thái'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingProds ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#94a3b8]">Đang tải...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10 text-[#94a3b8]">Chưa có sản phẩm nào trên {label}</td></tr>
                ) : products.map(p => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--smc-border)' }} className="hover:opacity-80 transition-opacity">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-[13px] truncate max-w-[220px]" style={{ color: 'var(--smc-text)' }}>{p.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{p.sku}</div>
                    </td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{p.category}</td>
                    <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{p.price.toLocaleString('vi-VN')}đ</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: p.stock === 0 ? '#dc2626' : p.stock < 50 ? '#d97706' : '#16a34a' }}>{p.stock}</td>
                    <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--smc-text-2)' }}>{p.total_sales}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                          <div className="h-full rounded-full" style={{ width: `${p.seo_score}%`, background: p.seo_score >= 70 ? '#16a34a' : p.seo_score >= 40 ? '#d97706' : '#dc2626' }}/>
                        </div>
                        <span className="text-[11px] font-semibold" style={{ color: 'var(--smc-text-3)' }}>{p.seo_score}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                        style={{ background: p.status === 'active' ? '#f0fdf4' : '#f1f5f9', color: p.status === 'active' ? '#16a34a' : '#64748b' }}>
                        {p.status === 'active' ? '● Đang bán' : '○ Ẩn'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: ORDERS ══════════════ */}
      {tab === 'orders' && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-[360px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--smc-text-4)' }}/>
              <input
                value={orderQ}
                onChange={e => setOrderQ(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && loadOrders()}
                placeholder="Tìm đơn hàng, khách hàng..."
                className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px] outline-none"
                style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}
              />
            </div>
            <select
              value={orderStatus}
              onChange={e => setOrderStatus(e.target.value)}
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}
            >
              <option value="">Tất cả trạng thái</option>
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={loadOrders} className="px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold" style={{ background: color }}>Tìm</button>
          </div>
          <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                  {['Mã đơn', 'Khách hàng', 'Shop', 'Giá trị', 'Trạng thái', 'Ngày tạo'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#94a3b8]">Đang tải...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-[#94a3b8]">Chưa có đơn hàng nào</td></tr>
                ) : orders.map(o => {
                  const st = ORDER_STATUS[o.status] ?? { label: o.status, color: '#64748b' };
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--smc-border)' }} className="hover:opacity-80 transition-opacity">
                      <td className="px-4 py-3 text-[13px] font-mono font-semibold" style={{ color: color }}>{o.order_no}</td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--smc-text)' }}>{o.customer_name}</td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{o.shop_name}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{o.total.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-3">
                        <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{ color: st.color, borderColor: st.color + '40', background: st.color + '12' }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{o.created_at.slice(0, 10)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: AI HUB ══════════════ */}
      {tab === 'ai' && (
        <div>
          <div className="mb-4">
            <h2 className="text-[16px] font-bold" style={{ color: 'var(--smc-text)' }}>AI Hub — {label}</h2>
            <p className="text-[13px] mt-1" style={{ color: 'var(--smc-text-3)' }}>
              Công cụ AI được tối ưu cho {label} · Áp dụng cho tất cả {shops.length} shop
            </p>
          </div>

          {/* AI Tools grid */}
          <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
            {aiTools.map(tool => (
              <button
                key={tool.id}
                onClick={() => runAi(tool)}
                disabled={aiLoading !== null}
                className="rounded-[16px] p-4 text-left transition-all hover:opacity-80 disabled:opacity-50"
                style={{ background: 'var(--smc-surface)', border: `1px solid ${aiLoading === tool.id ? color : 'var(--smc-border)'}`, boxShadow: '0 2px 8px var(--smc-shadow)' }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0" style={{ background: colorLight }}>
                    <span style={{ color }}>{tool.icon}</span>
                  </div>
                  <div>
                    <div className="text-[13.5px] font-semibold" style={{ color: 'var(--smc-text)' }}>{tool.title}</div>
                    {aiLoading === tool.id && (
                      <div className="text-[11px] font-medium" style={{ color }}>AI đang xử lý...</div>
                    )}
                  </div>
                </div>
                <p className="text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{tool.desc}</p>
              </button>
            ))}
          </div>

          {/* AI Result */}
          {aiResult && (
            <div className="rounded-[16px] p-5 relative" style={{ background: colorLight, border: `1px solid ${colorBorder}` }}>
              <button onClick={() => setAiResult(null)} className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-full hover:opacity-70" style={{ background: colorBorder }}>
                <X size={13} style={{ color: colorDark }}/>
              </button>
              <div className="flex items-center gap-2 mb-3">
                <Sparkles size={15} style={{ color }}/>
                <span className="text-[13px] font-bold" style={{ color: colorDark }}>
                  {aiTools.find(t => t.id === aiResult.toolId)?.title}
                </span>
              </div>
              <pre className="text-[13px] whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--smc-text)', fontFamily: 'inherit' }}>
                {aiResult.text}
              </pre>
              <button
                onClick={() => navigator.clipboard.writeText(aiResult.text)}
                className="mt-3 text-[12px] font-medium px-3 py-1.5 rounded-[8px] border transition-opacity hover:opacity-70"
                style={{ color, borderColor: colorBorder }}
              >
                Copy kết quả
              </button>
            </div>
          )}

          {/* Platform features */}
          <div className="mt-4 rounded-[14px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[12px] font-bold mb-2" style={{ color: 'var(--smc-text-4)' }}>ĐẶC THÙ {label.toUpperCase()}</div>
            <div className="flex flex-wrap gap-2">
              {platformFeatures.map((f, i) => (
                <span key={i} className="text-[12px] px-2.5 py-1 rounded-[8px]" style={{ background: colorLight, color: colorDark }}>
                  {f}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: ANALYTICS ══════════════ */}
      {tab === 'analytics' && (
        <div className="space-y-4">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
            {[
              { label: 'Tổng doanh thu', value: fmtMoney(totalRevenue), icon: <TrendingUp size={18}/> },
              { label: 'Tổng đơn hàng', value: totalOrders.toLocaleString('vi-VN'), icon: <ShoppingCart size={18}/> },
              { label: 'Shop hoạt động', value: `${activeShops}/${shops.length}`, icon: <Store size={18}/> },
            ].map((kpi, i) => (
              <div key={i} className="rounded-[16px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color }}>{kpi.icon}</span>
                  <span className="text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{kpi.label}</span>
                </div>
                <div className="text-[22px] font-extrabold" style={{ color: 'var(--smc-text)' }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          <div className="rounded-[16px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[13px] font-bold mb-3" style={{ color: 'var(--smc-text)' }}>Doanh thu theo shop</div>
            <div className="space-y-3">
              {shops.map(shop => {
                const pct = totalRevenue > 0 ? (shop.revenue / totalRevenue) * 100 : 0;
                return (
                  <div key={shop.id}>
                    <div className="flex justify-between mb-1">
                      <span className="text-[12.5px] font-medium truncate max-w-[220px]" style={{ color: 'var(--smc-text)' }}>{shop.name}</span>
                      <span className="text-[12.5px] font-semibold" style={{ color }}>{fmtMoney(shop.revenue)}</span>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
                    </div>
                    <div className="text-[11px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>{shop.orders} đơn · {pct.toFixed(1)}% tổng</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ TAB: SETTINGS ══════════════ */}
      {tab === 'settings' && (
        <div className="space-y-4 max-w-[560px]">
          <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--smc-text)' }}>Cấu hình phí sàn</div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Phí sàn {label} (%)</label>
                <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} min={0} max={50} step={0.5}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface-2,#f8fafc)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}
                />
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Thuế VAT (%)</label>
                <input type="number" value={vat} onChange={e => setVat(Number(e.target.value))} min={0} max={30}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface-2,#f8fafc)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}
                />
              </div>
              <div className="rounded-[10px] p-3" style={{ background: colorLight }}>
                <div className="text-[12px]" style={{ color: colorDark }}>
                  Với phí sàn {fee}% + VAT {vat}% → sản phẩm 300.000đ, lãi thực tế sau phí: <strong>{Math.round(300000 * (1 - fee / 100) * (1 - vat / 100)).toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--smc-text)' }}>Quản lý OAuth</div>
            <div className="space-y-3">
              {shops.map(shop => {
                const ts = tokenState(shop.token_expires_at);
                return (
                  <div key={shop.id} className="flex items-center justify-between p-3 rounded-[10px]" style={{ background: 'var(--smc-surface-2,#f8fafc)', border: '1px solid var(--smc-border)' }}>
                    <div>
                      <div className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{shop.name}</div>
                      <div className="text-[11.5px] mt-0.5 flex items-center gap-1.5">
                        <span style={{ color: TOKEN_COLOR[ts] }}>●</span>
                        <span style={{ color: 'var(--smc-text-3)' }}>
                          {ts === 'ok' ? `Token còn ${Math.round((new Date(shop.token_expires_at!).getTime() - Date.now()) / 86400000)} ngày` : TOKEN_LABEL[ts]}
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => refreshToken(shop.id)}
                      disabled={refreshing === shop.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all hover:opacity-80"
                      style={{ background: colorLight, color: colorDark, border: `1px solid ${colorBorder}` }}
                    >
                      <RotateCcw size={12}/>
                      {refreshing === shop.id ? 'Đang làm mới...' : 'Làm mới token'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════ CONNECT MODAL ══════════════ */}
      {connectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }} onClick={() => setConnectOpen(false)}>
          <div className="rounded-[20px] p-6 w-[400px] shadow-2xl" style={{ background: 'var(--smc-surface)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] flex items-center justify-center" style={{ background: color }}>{logo}</div>
                <div>
                  <div className="text-[15px] font-bold" style={{ color: 'var(--smc-text)' }}>Kết nối {label}</div>
                  <div className="text-[12px]" style={{ color: 'var(--smc-text-3)' }}>OAuth 2.0 · Bảo mật</div>
                </div>
              </div>
              <button onClick={() => setConnectOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70" style={{ background: 'var(--smc-border)' }}>
                <X size={14} style={{ color: 'var(--smc-text-3)' }}/>
              </button>
            </div>
            <div className="space-y-3 mb-5 text-[13px]" style={{ color: 'var(--smc-text-2)' }}>
              <div className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color }}/><span>Nhấn nút bên dưới để được chuyển đến trang đăng nhập {label}</span></div>
              <div className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color }}/><span>Đăng nhập tài khoản Seller Center và cấp quyền truy cập</span></div>
              <div className="flex items-start gap-2"><ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color }}/><span>Hệ thống tự động lưu token và bắt đầu đồng bộ dữ liệu</span></div>
            </div>
            <button
              onClick={connectOAuth}
              className="w-full py-3 rounded-[12px] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-85"
              style={{ background: color }}
            >
              <Zap size={16}/> Kết nối {label} ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
