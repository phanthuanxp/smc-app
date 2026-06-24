'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Plus, RefreshCw, CheckCircle, XCircle, AlertCircle, ExternalLink,
  Search, Sparkles, BarChart3, Settings, Package, ChevronRight,
  ShoppingCart, Store, KeyRound, Clock, RotateCcw, Zap, TrendingUp,
  MessageSquare, Tag, X, Copy, Truck, AlertTriangle,
  CheckSquare, Eye, Square, Layers, Percent, DollarSign,
  Ticket, Flame, Calendar, Users, ToggleLeft, ToggleRight,
  Star, Award, MousePointer, ShoppingBag, ArrowUpRight, Edit3, Link,
  Video, Play, Radio, Clock3, RotateCcwSquare, PackageCheck, PackageX,
  ChevronLeft, ChevronRight as ChevronRightIcon, Wand2,
} from 'lucide-react';

// ── Types ────────────────────────────────────────────────────────────────────
interface Shop {
  id: number; name: string; channel: string;
  status: 'active' | 'inactive' | 'error';
  product_count: number; revenue: number; orders: number;
  connected_at: string; last_sync_at: string | null;
  listing_count: number; token_expires_at: string | null;
}
interface Product {
  id: number; sku: string; name: string; category: string;
  price: number; cost_price: number; sale_price: number; stock: number;
  status: string; channels: string | null; listing_count: number;
  total_sales: number; seo_score: number;
}
interface Order {
  id: number; order_no: string; customer_name: string; customer_phone: string;
  shop_id: number; shop_name: string; channel: string;
  status: string; total: number; shipping_fee: number; created_at: string;
}
interface Listing {
  id: number; product_id: number; shop_id: number;
  external_id: string; status: string;
  price: number; stock: number; views: number; sales: number;
  published_at: string; updated_at: string;
  shop_name: string; channel: string;
  product_name: string; sku: string;
}
interface ConfigStatus {
  configured: boolean; channel: string;
  shops: { total: number; active: number; tokenValid: number };
  setup: { title: string; steps: string[] } | null;
}

// ── Live Sessions ─────────────────────────────────────────────────────────────
interface LiveSession {
  id: number; channel: string; shop_id: number; shop_name: string;
  title: string; scheduled_at: string; duration_minutes: number;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  products: string; script: string;
  viewer_count: number; orders_count: number; gmv: number;
  created_at: string;
}
interface LiveStats {
  total: number; total_viewers: number; total_orders: number; total_gmv: number;
}

// ── Returns ───────────────────────────────────────────────────────────────────
interface Return {
  id: number; channel: string; order_id: number; order_no: string;
  shop_id: number; shop_name: string; customer_name: string;
  reason: string; items: string; refund_amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'resolved';
  restock: number; note: string; created_at: string; resolved_at: string | null;
}
interface ReturnStats {
  total: number; pending_count: number; total_refund: number;
}

// ── Affiliate ────────────────────────────────────────────────────────────────
interface AffiliateProduct {
  id: number; channel: string; shop_id: number; shop_name: string;
  product_id: number; product_name: string; sku: string;
  price: number; sale_price: number; category: string;
  commission_rate: number; status: string;
  clicks: number; conversions: number; revenue: number;
  enrolled_at: string;
}
interface AffiliateCreator {
  id: number; channel: string; shop_id: number; shop_name: string;
  creator_name: string; creator_handle: string;
  followers: number; gmv: number; orders: number;
  commission_earned: number; status: string; joined_at: string;
}
interface AffiliateStats {
  enrolled: number; total_clicks: number; total_conversions: number;
  total_revenue: number; avg_commission: number;
}
interface CreatorStats {
  total_creators: number; total_gmv: number;
  total_orders: number; total_commission: number;
}

// ── Deals & Vouchers ─────────────────────────────────────────────────────────
interface Deal {
  id: number; channel: string; shop_id: number; shop_name: string;
  name: string; discount_type: 'percent' | 'fixed';
  discount_value: number; min_purchase: number; max_discount: number;
  start_at: string; end_at: string; status: string;
  products: string; created_at: string;
}
interface Voucher {
  id: number; channel: string; shop_id: number; shop_name: string;
  code: string; discount_type: 'percent' | 'fixed';
  discount_value: number; min_purchase: number; max_discount: number;
  usage_limit: number; usage_count: number;
  start_at: string; end_at: string; status: string; created_at: string;
}

// Bulk publish
type PriceMode = 'keep' | 'percent' | 'fixed';
interface BulkTask {
  productId: number; productName: string; sku: string;
  shopId: number; shopName: string;
  price: number;
  state: 'pending' | 'running' | 'ok' | 'error' | 'skip';
  message?: string; externalId?: string;
}

export interface AiTool {
  id: string; icon: React.ReactNode; title: string; desc: string; prompt: string;
}
export interface PlatformConfig {
  channel: 'tiktok' | 'shopee'; label: string;
  color: string; colorDark: string; colorLight: string; colorBorder: string;
  logo: React.ReactNode; feeDefault: number;
  platformFeatures: string[]; aiTools: AiTool[];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmtMoney = (v: number) => v >= 1_000_000
  ? `${(v / 1_000_000).toFixed(1)}M đ`
  : v >= 1000 ? `${Math.round(v / 1_000)}k đ`
  : `${Math.round(v)}đ`;
const fmtTime = (s: string | null) => {
  if (!s) return '—';
  const diff = (Date.now() - new Date(s).getTime()) / 60000;
  if (diff < 1) return 'vừa xong';
  if (diff < 60) return `${Math.round(diff)}p trước`;
  if (diff < 1440) return `${Math.round(diff / 60)}h trước`;
  return `${Math.round(diff / 1440)} ngày trước`;
};
type TokenState = 'none' | 'expired' | 'soon' | 'ok';
function tokenState(exp: string | null): TokenState {
  if (!exp) return 'none';
  const d = (new Date(exp).getTime() - Date.now()) / 86400000;
  if (d < 0) return 'expired'; if (d < 7) return 'soon'; return 'ok';
}
const TOKEN_COLOR: Record<TokenState, string> = {
  none: '#94a3b8', expired: '#dc2626', soon: '#d97706', ok: '#16a34a',
};
const STATUS_ICON = { active: CheckCircle, inactive: XCircle, error: AlertCircle };
const STATUS_COLOR = { active: '#16a34a', inactive: '#94a3b8', error: '#dc2626' };
const STATUS_LABEL = { active: 'Đang kết nối', inactive: 'Ngừng hoạt động', error: 'Lỗi kết nối' };
const ORDER_STATUS: Record<string, { label: string; color: string }> = {
  new:               { label: 'Mới', color: '#2563eb' },
  confirmed:         { label: 'Xác nhận', color: '#7c3aed' },
  awaiting_shipment: { label: 'Chờ giao', color: '#d97706' },
  shipped:           { label: 'Đang giao', color: '#0891b2' },
  delivered:         { label: 'Hoàn thành', color: '#16a34a' },
  cancelled:         { label: 'Huỷ', color: '#dc2626' },
  return_refund:     { label: 'Hoàn trả', color: '#9a3412' },
};
const LISTING_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  active:   { label: 'Đang bán', color: '#16a34a', bg: '#f0fdf4' },
  pending:  { label: 'Chờ duyệt', color: '#d97706', bg: '#fffbeb' },
  rejected: { label: 'Bị từ chối', color: '#dc2626', bg: '#fef2f2' },
  inactive: { label: 'Tắt', color: '#94a3b8', bg: '#f8fafc' },
  error:    { label: 'Lỗi', color: '#dc2626', bg: '#fef2f2' },
};
const BULK_STATE_COLOR: Record<BulkTask['state'], string> = {
  pending: '#94a3b8', running: '#2563eb', ok: '#16a34a', error: '#dc2626', skip: '#d97706',
};
const BULK_STATE_LABEL: Record<BulkTask['state'], string> = {
  pending: 'Chờ', running: 'Đang đăng...', ok: 'Thành công', error: 'Lỗi', skip: 'Đã có',
};

type Tab = 'shops' | 'products' | 'orders' | 'promo' | 'affiliate' | 'live' | 'ai' | 'analytics' | 'settings';

// ── Main component ────────────────────────────────────────────────────────────
export default function PlatformHub({ cfg }: { cfg: PlatformConfig }) {
  const { channel, label, color, colorDark, colorLight, colorBorder, logo, feeDefault, platformFeatures, aiTools } = cfg;
  const searchParams = useSearchParams();

  // Core data
  const [tab, setTab] = useState<Tab>('shops');
  const [shops, setShops] = useState<Shop[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [configStatus, setConfigStatus] = useState<ConfigStatus | null>(null);

  // Loading states
  const [loadingShops, setLoadingShops] = useState(true);
  const [loadingProds, setLoadingProds] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);

  // Action states
  const [syncing, setSyncing] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState<number | null>(null);
  const [confirmingShipment, setConfirmingShipment] = useState<number | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [togglingListing, setTogglingListing] = useState<number | null>(null);

  // UI states
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null);
  const [connectOpen, setConnectOpen] = useState(false);
  const [publishDrawer, setPublishDrawer] = useState<{ open: boolean; product: Product | null }>({ open: false, product: null });
  const [publishShopId, setPublishShopId] = useState<number | ''>('');
  const [publishPrice, setPublishPrice] = useState('');
  const [publishResult, setPublishResult] = useState<{ ok: boolean; msg: string; externalId?: string } | null>(null);
  const [prodQ, setProdQ] = useState('');
  const [orderQ, setOrderQ] = useState('');
  const [orderStatus, setOrderStatus] = useState('');
  const [selectedShop, setSelectedShop] = useState<number | ''>('');
  const [aiLoading, setAiLoading] = useState<string | null>(null);
  const [aiResult, setAiResult] = useState<{ toolId: string; text: string } | null>(null);
  const [fee, setFee] = useState(feeDefault);
  const [vat, setVat] = useState(10);

  // ── Product Edit/Create Drawer ───────────────────────────────────────────────
  const [prodDrawerOpen, setProdDrawerOpen] = useState(false);
  const [prodDrawerMode, setProdDrawerMode] = useState<'create' | 'edit'>('create');
  const [prodForm, setProdForm] = useState({
    id: 0, sku: '', name: '', category: '', description: '', price: '',
    cost_price: '', sale_price: '', stock: '', weight: '', status: 'active', image_url: '',
  });
  const [prodSaving, setProdSaving] = useState(false);
  const [prodSaveErr, setProdSaveErr] = useState('');
  const [aiField, setAiField] = useState<string | null>(null); // which field is AI generating
  const [aiFieldResult, setAiFieldResult] = useState<{ field: string; text: string } | null>(null);

  // ── Live Schedule state ──────────────────────────────────────────────────────
  const [liveWeek, setLiveWeek] = useState(0);
  const [liveSessions, setLiveSessions] = useState<LiveSession[]>([]);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [loadingLive, setLoadingLive] = useState(false);
  const [liveShopId, setLiveShopId] = useState<number | ''>('');
  const [liveFormOpen, setLiveFormOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<LiveSession | null>(null);
  const [liveForm, setLiveForm] = useState({ shopId: '' as number | '', title: '', scheduledAt: '', durationMinutes: '60' });
  const [liveFormSaving, setLiveFormSaving] = useState(false);
  const [generatingScript, setGeneratingScript] = useState(false);
  const [scriptPreview, setScriptPreview] = useState('');

  // ── Returns state ─────────────────────────────────────────────────────────
  const [ordersSubTab, setOrdersSubTab] = useState<'list' | 'returns'>('list');
  const [returnsList, setReturnsList] = useState<Return[]>([]);
  const [returnsStats, setReturnsStats] = useState<ReturnStats | null>(null);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [returnStatusFilter, setReturnStatusFilter] = useState('');
  const [selectedReturn, setSelectedReturn] = useState<Return | null>(null);

  // ── Affiliate state ──────────────────────────────────────────────────────────
  const [affiliateTab, setAffiliateTab] = useState<'products' | 'creators'>('products');
  const [affiliateProducts, setAffiliateProducts] = useState<AffiliateProduct[]>([]);
  const [affiliateCreators, setAffiliateCreators] = useState<AffiliateCreator[]>([]);
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats | null>(null);
  const [creatorStats, setCreatorStats] = useState<CreatorStats | null>(null);
  const [loadingAffiliate, setLoadingAffiliate] = useState(false);
  const [affiliateShopId, setAffiliateShopId] = useState<number | ''>('');
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollProductId, setEnrollProductId] = useState<number | ''>('');
  const [enrollShopId, setEnrollShopId] = useState<number | ''>('');
  const [enrollRate, setEnrollRate] = useState('10');
  const [enrollSaving, setEnrollSaving] = useState(false);
  const [enrollError, setEnrollError] = useState('');
  const [editingCommission, setEditingCommission] = useState<{ id: number; rate: number } | null>(null);

  // ── Deals & Vouchers state ───────────────────────────────────────────────────
  const [promoTab, setPromoTab] = useState<'deals' | 'vouchers'>('deals');
  const [deals, setDeals] = useState<Deal[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);
  const [loadingVouchers, setLoadingVouchers] = useState(false);
  const [dealFilterShop, setDealFilterShop] = useState<number | ''>('');
  const [voucherFilterShop, setVoucherFilterShop] = useState<number | ''>('');

  // Deal form
  const [dealFormOpen, setDealFormOpen] = useState(false);
  const [dealForm, setDealForm] = useState({
    shopId: '' as number | '', name: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '', minPurchase: '', maxDiscount: '',
    startAt: '', endAt: '',
  });
  const [dealSaving, setDealSaving] = useState(false);
  const [dealError, setDealError] = useState('');

  // Voucher form
  const [voucherFormOpen, setVoucherFormOpen] = useState(false);
  const [voucherForm, setVoucherForm] = useState({
    shopId: '' as number | '', code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: '', minPurchase: '', maxDiscount: '',
    usageLimit: '100', startAt: '', endAt: '',
  });
  const [voucherSaving, setVoucherSaving] = useState(false);
  const [voucherError, setVoucherError] = useState('');

  // ── Bulk select state ────────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkShopIds, setBulkShopIds] = useState<Set<number>>(new Set());
  const [bulkPriceMode, setBulkPriceMode] = useState<PriceMode>('keep');
  const [bulkPriceValue, setBulkPriceValue] = useState('');
  const [bulkTasks, setBulkTasks] = useState<BulkTask[]>([]);
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkDone, setBulkDone] = useState(false);
  const bulkAbort = useRef(false);

  // ── Data loaders ────────────────────────────────────────────────────────────
  const loadConfig = useCallback(async () => {
    const r = await fetch(`/api/channels/${channel}/status`);
    const d = await r.json();
    setConfigStatus(d);
  }, [channel]);

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
    const sh = selectedShop ? `&shop_id=${selectedShop}` : '';
    const r = await fetch(`/api/products?channel=${channel}${q}${sh}&limit=50`);
    const d = await r.json();
    setProducts(d.products ?? []);
    setSelectedIds(new Set()); // clear selection on reload
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

  const loadListings = useCallback(async () => {
    const r = await fetch(`/api/listings?channel=${channel}`);
    const d = await r.json();
    setListings(d.listings ?? []);
  }, [channel]);

  const loadDeals = useCallback(async () => {
    setLoadingDeals(true);
    const sh = dealFilterShop ? `&shopId=${dealFilterShop}` : '';
    const r = await fetch(`/api/channels/${channel}/deals?${sh}`);
    const d = await r.json();
    setDeals(d.deals ?? []);
    setLoadingDeals(false);
  }, [channel, dealFilterShop]);

  const loadVouchers = useCallback(async () => {
    setLoadingVouchers(true);
    const sh = voucherFilterShop ? `&shopId=${voucherFilterShop}` : '';
    const r = await fetch(`/api/channels/${channel}/vouchers?${sh}`);
    const d = await r.json();
    setVouchers(d.vouchers ?? []);
    setLoadingVouchers(false);
  }, [channel, voucherFilterShop]);

  useEffect(() => {
    loadConfig();
    loadShops();
  }, [loadConfig, loadShops]);

  // Banner check on mount only — searchParams not in deps to avoid infinite loop
  useEffect(() => {
    if (searchParams.get('connected') === 'true') {
      setBanner({ type: 'ok', msg: `Kết nối ${label} thành công! Shop đã được thêm vào hệ thống.` });
    } else if (searchParams.get('error')) {
      const err = decodeURIComponent(searchParams.get('error') ?? 'Lỗi không xác định');
      setBanner({ type: 'err', msg: `Kết nối thất bại: ${err}` });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { if (tab === 'products') { loadProducts(); loadListings(); } }, [tab, loadProducts, loadListings]);
  useEffect(() => { if (tab === 'orders') loadOrders(); }, [tab, loadOrders]);
  useEffect(() => { if (tab === 'promo') { loadDeals(); loadVouchers(); } }, [tab, loadDeals, loadVouchers]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const syncShop = async (id: number) => {
    setSyncing(id);
    const r = await fetch('/api/channels/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: id }),
    });
    const d = await r.json();
    const ok = d.results?.[0]?.status === 'success';
    setBanner({ type: ok ? 'ok' : 'err', msg: ok ? 'Đồng bộ thành công!' : `Đồng bộ thất bại: ${d.results?.[0]?.message ?? 'Lỗi'}` });
    await loadShops(); setSyncing(null);
  };

  const refreshToken = async (id: number) => {
    setRefreshing(id);
    const r = await fetch(`/api/shops/${id}/refresh`, { method: 'POST' });
    const d = await r.json();
    setBanner(d.ok ? { type: 'ok', msg: 'Làm mới token thành công!' } : { type: 'err', msg: `Làm mới token thất bại: ${d.error ?? ''}` });
    await loadShops(); setRefreshing(null);
  };

  const connectOAuth = async () => {
    const r = await fetch(`/api/channels/${channel}/connect`);
    const d = await r.json();
    if (d.configRequired) { setBanner({ type: 'err', msg: d.error }); setConnectOpen(false); return; }
    if (d.authUrl) window.location.href = d.authUrl;
  };

  const openPublishDrawer = (product: Product) => {
    setPublishDrawer({ open: true, product });
    setPublishShopId(shops[0]?.id ?? '');
    setPublishPrice(String(product.sale_price || product.price));
    setPublishResult(null);
  };

  const submitPublish = async () => {
    if (!publishDrawer.product || !publishShopId) return;
    setPublishing(true); setPublishResult(null);
    const r = await fetch(`/api/channels/${channel}/publish`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: publishDrawer.product.id, shopId: publishShopId, priceOverride: publishPrice ? Number(publishPrice) : undefined }),
    });
    const d = await r.json();
    setPublishResult({ ok: d.ok, msg: d.message ?? d.error ?? '', externalId: d.externalId });
    if (d.ok) await loadListings();
    setPublishing(false);
  };

  const confirmShipment = async (orderId: number) => {
    setConfirmingShipment(orderId);
    await new Promise(r => setTimeout(r, 800));
    setBanner({ type: 'ok', msg: 'Đã xác nhận giao hàng thành công!' });
    await loadOrders(); setConfirmingShipment(null);
  };

  const toggleListing = async (listingId: number, currentStatus: string) => {
    setTogglingListing(listingId);
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
    await fetch('/api/listings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: listingId, status: newStatus }),
    });
    await loadListings(); setTogglingListing(null);
  };

  const openCreateProduct = () => {
    setProdForm({ id: 0, sku: `SKU-${Date.now().toString(36).toUpperCase()}`, name: '', category: '', description: '', price: '', cost_price: '', sale_price: '', stock: '', weight: '', status: 'active', image_url: '' });
    setProdDrawerMode('create'); setProdSaveErr(''); setAiFieldResult(null);
    setProdDrawerOpen(true);
  };

  const openEditProduct = (p: Product) => {
    setProdForm({ id: p.id, sku: p.sku, name: p.name, category: p.category, description: '', price: String(p.price), cost_price: String(p.cost_price), sale_price: String(p.sale_price || ''), stock: String(p.stock), weight: '', status: p.status, image_url: '' });
    // fetch full product to get description
    fetch(`/api/products/${p.id}`).then(r => r.json()).then(d => {
      setProdForm(prev => ({ ...prev, description: d.product?.description ?? '', weight: String(d.product?.weight ?? ''), image_url: d.product?.image_url ?? '' }));
    });
    setProdDrawerMode('edit'); setProdSaveErr(''); setAiFieldResult(null);
    setProdDrawerOpen(true);
  };

  const saveProduct = async () => {
    if (!prodForm.name || !prodForm.sku || !prodForm.price) { setProdSaveErr('Vui lòng điền tên, SKU và giá'); return; }
    setProdSaving(true); setProdSaveErr('');
    const payload = {
      name: prodForm.name, sku: prodForm.sku, category: prodForm.category,
      description: prodForm.description, price: Number(prodForm.price),
      cost_price: Number(prodForm.cost_price || 0), sale_price: Number(prodForm.sale_price || 0),
      stock: Number(prodForm.stock || 0), weight: Number(prodForm.weight || 0),
      status: prodForm.status, image_url: prodForm.image_url,
    };
    let ok = false;
    if (prodDrawerMode === 'create') {
      const r = await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      ok = (await r.json()).ok;
    } else {
      const r = await fetch(`/api/products/${prodForm.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      ok = (await r.json()).ok;
    }
    if (ok) { setProdDrawerOpen(false); await loadProducts(); }
    else setProdSaveErr('Lưu thất bại. Kiểm tra SKU có trùng không.');
    setProdSaving(false);
  };

  const aiGenerateForProduct = async (field: 'name' | 'description' | 'seo') => {
    setAiField(field); setAiFieldResult(null);
    const ctx = `Sản phẩm: "${prodForm.name || 'chưa có tên'}", Danh mục: "${prodForm.category || 'chưa có'}", Giá: ${prodForm.sale_price || prodForm.price || 'chưa có'}đ.`;
    const prompts: Record<string, string> = {
      name: `${ctx} Viết 3 tiêu đề sản phẩm tối ưu cho ${label} (40-80 ký tự, chứa từ khóa hot, tạo cảm giác urgency). Đánh số 1. 2. 3.`,
      description: `${ctx} Viết mô tả sản phẩm hấp dẫn cho ${label} (150-300 từ). Cần: đặc điểm nổi bật, lợi ích cho người dùng, CTA. Dùng emoji phù hợp.`,
      seo: `${ctx} Phân tích SEO và đề xuất: 1) Tiêu đề tối ưu, 2) Từ khóa chính (5-8 từ), 3) Điểm yếu cần cải thiện, 4) Mô tả ngắn cho SEO snippet.`,
    };
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompts[field], channel }),
      });
      const d = await r.json();
      setAiFieldResult({ field, text: d.text ?? d.message ?? 'Không thể tạo nội dung.' });
    } catch { setAiFieldResult({ field, text: 'Lỗi kết nối AI.' }); }
    setAiField(null);
  };

  const applyAiToField = (field: string, text: string) => {
    if (field === 'name') {
      // Extract first option if numbered list
      const first = text.match(/1\.\s*(.+)/)?.[1]?.trim() ?? text.split('\n')[0];
      setProdForm(f => ({ ...f, name: first }));
    } else if (field === 'description') {
      setProdForm(f => ({ ...f, description: text }));
    }
    setAiFieldResult(null);
  };

  const createLiveSession = async () => {
    if (!liveForm.shopId || !liveForm.title || !liveForm.scheduledAt) return;
    setLiveFormSaving(true);
    const r = await fetch(`/api/channels/${channel}/live`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId: Number(liveForm.shopId), title: liveForm.title, scheduledAt: liveForm.scheduledAt, durationMinutes: Number(liveForm.durationMinutes) }),
    });
    const d = await r.json();
    if (d.ok) {
      setLiveFormOpen(false);
      setLiveForm({ shopId: '', title: '', scheduledAt: '', durationMinutes: '60' });
      await loadLive();
    }
    setLiveFormSaving(false);
  };

  const deleteLiveSession = async (id: number) => {
    await fetch(`/api/channels/${channel}/live`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    setSelectedSession(null);
    await loadLive();
  };

  const generateLiveScript = async (session: LiveSession) => {
    setGeneratingScript(true);
    setScriptPreview('');
    try {
      const r = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `Tạo script LIVE bán hàng cho phiên "${session.title}" trên ${channel === 'tiktok' ? 'TikTok Shop' : 'Shopee'}. Thời lượng ${session.duration_minutes} phút. Script cần có: phần mở đầu chào khán giả, giới thiệu chương trình flash sale, kêu gọi tương tác, tạo urgency và kết thúc. Viết bằng tiếng Việt, ngắn gọn, năng lượng cao.`,
          channel,
        }),
      });
      const d = await r.json();
      const text = d.text ?? d.message ?? 'Không thể tạo script.';
      setScriptPreview(text);
      // Save script to session
      await fetch(`/api/channels/${channel}/live`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: session.id, script: text }),
      });
      await loadLive();
    } catch { setScriptPreview('Lỗi kết nối AI.'); }
    setGeneratingScript(false);
  };

  const resolveReturn = async (id: number, status: string) => {
    await fetch(`/api/channels/${channel}/returns`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    setSelectedReturn(null);
    await loadReturns();
  };

  const loadAffiliate = useCallback(async () => {
    setLoadingAffiliate(true);
    const sh = affiliateShopId ? `&shopId=${affiliateShopId}` : '';
    const [rProd, rCreator] = await Promise.all([
      fetch(`/api/channels/${channel}/affiliate?type=products${sh}`),
      fetch(`/api/channels/${channel}/affiliate?type=creators${sh || (shops[0] ? `&shopId=${shops[0].id}` : '')}`),
    ]);
    const dProd = await rProd.json();
    const dCreator = await rCreator.json();
    setAffiliateProducts(dProd.affiliateProducts ?? []);
    setAffiliateStats(dProd.stats ?? null);
    setAffiliateCreators(dCreator.creators ?? []);
    setCreatorStats(dCreator.stats ?? null);
    setLoadingAffiliate(false);
  }, [channel, affiliateShopId, shops]);

  useEffect(() => { if (tab === 'affiliate') loadAffiliate(); }, [tab, loadAffiliate]);

  const loadLive = useCallback(async () => {
    setLoadingLive(true);
    const sh = liveShopId ? `&shopId=${liveShopId}` : '';
    const r = await fetch(`/api/channels/${channel}/live?week=${liveWeek}${sh}`);
    const d = await r.json();
    setLiveSessions(d.sessions ?? []);
    setLiveStats(d.stats ?? null);
    setLoadingLive(false);
  }, [channel, liveWeek, liveShopId]);

  useEffect(() => { if (tab === 'live') loadLive(); }, [tab, loadLive]);

  const loadReturns = useCallback(async () => {
    setLoadingReturns(true);
    const sh = selectedShop ? `&shopId=${selectedShop}` : '';
    const st = returnStatusFilter ? `&status=${returnStatusFilter}` : '';
    const r = await fetch(`/api/channels/${channel}/returns?${sh}${st}`);
    const d = await r.json();
    setReturnsList(d.returns ?? []);
    setReturnsStats(d.stats ?? null);
    setLoadingReturns(false);
  }, [channel, selectedShop, returnStatusFilter]);

  const enrollAffiliate = async () => {
    if (!enrollProductId || !enrollShopId) { setEnrollError('Chọn sản phẩm và shop'); return; }
    setEnrollSaving(true); setEnrollError('');
    const r = await fetch(`/api/channels/${channel}/affiliate`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: Number(enrollProductId), shopId: Number(enrollShopId), commissionRate: Number(enrollRate) }),
    });
    const d = await r.json();
    if (d.ok) {
      setEnrollOpen(false);
      setEnrollProductId(''); setEnrollRate('10');
      await loadAffiliate();
    } else { setEnrollError(d.error ?? 'Lỗi'); }
    setEnrollSaving(false);
  };

  const updateCommission = async (id: number, rate: number) => {
    await fetch(`/api/channels/${channel}/affiliate`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, commissionRate: rate }),
    });
    setEditingCommission(null);
    await loadAffiliate();
  };

  const toggleAffiliateProduct = async (id: number, status: string) => {
    await fetch(`/api/channels/${channel}/affiliate`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: status === 'active' ? 'paused' : 'active' }),
    });
    await loadAffiliate();
  };

  const saveDeal = async () => {
    if (!dealForm.shopId || !dealForm.name || !dealForm.discountValue || !dealForm.startAt || !dealForm.endAt) {
      setDealError('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
    }
    setDealSaving(true); setDealError('');
    const r = await fetch(`/api/channels/${channel}/deals`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: Number(dealForm.shopId), name: dealForm.name,
        discountType: dealForm.discountType, discountValue: Number(dealForm.discountValue),
        minPurchase: Number(dealForm.minPurchase) || 0,
        maxDiscount: Number(dealForm.maxDiscount) || 0,
        startAt: dealForm.startAt, endAt: dealForm.endAt,
      }),
    });
    const d = await r.json();
    if (d.ok) {
      setDealFormOpen(false);
      setDealForm({ shopId: '', name: '', discountType: 'percent', discountValue: '', minPurchase: '', maxDiscount: '', startAt: '', endAt: '' });
      await loadDeals();
    } else {
      setDealError(d.error ?? 'Lỗi tạo Flash Deal');
    }
    setDealSaving(false);
  };

  const saveVoucher = async () => {
    if (!voucherForm.shopId || !voucherForm.code || !voucherForm.discountValue || !voucherForm.startAt || !voucherForm.endAt) {
      setVoucherError('Vui lòng điền đầy đủ thông tin bắt buộc'); return;
    }
    setVoucherSaving(true); setVoucherError('');
    const r = await fetch(`/api/channels/${channel}/vouchers`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        shopId: Number(voucherForm.shopId), code: voucherForm.code,
        discountType: voucherForm.discountType, discountValue: Number(voucherForm.discountValue),
        minPurchase: Number(voucherForm.minPurchase) || 0,
        maxDiscount: Number(voucherForm.maxDiscount) || 0,
        usageLimit: Number(voucherForm.usageLimit) || 100,
        startAt: voucherForm.startAt, endAt: voucherForm.endAt,
      }),
    });
    const d = await r.json();
    if (d.ok) {
      setVoucherFormOpen(false);
      setVoucherForm({ shopId: '', code: '', discountType: 'percent', discountValue: '', minPurchase: '', maxDiscount: '', usageLimit: '100', startAt: '', endAt: '' });
      await loadVouchers();
    } else {
      setVoucherError(d.error ?? 'Lỗi tạo voucher');
    }
    setVoucherSaving(false);
  };

  const toggleDeal = async (id: number, status: string) => {
    const newStatus = status === 'active' ? 'cancelled' : status === 'scheduled' ? 'active' : status;
    await fetch(`/api/channels/${channel}/deals`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    await loadDeals();
  };

  const toggleVoucher = async (id: number, status: string) => {
    const newStatus = status === 'active' ? 'inactive' : 'active';
    await fetch(`/api/channels/${channel}/vouchers`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status: newStatus }),
    });
    await loadVouchers();
  };

  const runAi = async (tool: AiTool) => {
    setAiLoading(tool.id); setAiResult(null);
    try {
      const r = await fetch('/api/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [{ role: 'user', content: tool.prompt }] }),
      });
      const d = await r.json();
      setAiResult({ toolId: tool.id, text: d.content ?? d.message ?? JSON.stringify(d) });
    } catch {
      setAiResult({ toolId: tool.id, text: 'Lỗi kết nối AI. Vui lòng kiểm tra cài đặt AI provider.' });
    }
    setAiLoading(null);
  };

  // ── Bulk select helpers ──────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelectedIds(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };
  const toggleSelectAll = () => {
    if (selectedIds.size === products.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(products.map(p => p.id)));
  };
  const toggleBulkShop = (id: number) => {
    setBulkShopIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  // Compute preview price for a product given bulk price mode
  const bulkPrice = (product: Product): number => {
    const base = product.sale_price || product.price;
    if (bulkPriceMode === 'keep') return base;
    if (bulkPriceMode === 'percent') {
      const pct = Number(bulkPriceValue);
      return pct > 0 ? Math.round(base * (1 - pct / 100)) : base;
    }
    return Number(bulkPriceValue) || base;
  };

  // Build task list from selection × shops
  const buildTasks = (): BulkTask[] => {
    const selectedProducts = products.filter(p => selectedIds.has(p.id));
    const targetShops = shops.filter(s => bulkShopIds.has(s.id));
    const tasks: BulkTask[] = [];
    for (const p of selectedProducts) {
      for (const s of targetShops) {
        tasks.push({
          productId: p.id, productName: p.name, sku: p.sku,
          shopId: s.id, shopName: s.name,
          price: bulkPrice(p),
          state: 'pending',
        });
      }
    }
    return tasks;
  };

  const openBulkModal = () => {
    setBulkShopIds(shops.length > 0 ? new Set([shops[0].id]) : new Set());
    setBulkPriceMode('keep');
    setBulkPriceValue('');
    setBulkTasks([]);
    setBulkRunning(false);
    setBulkDone(false);
    bulkAbort.current = false;
    setBulkOpen(true);
  };

  const startBulkPublish = async () => {
    const tasks = buildTasks();
    if (tasks.length === 0) return;
    setBulkTasks(tasks);
    setBulkRunning(true);
    setBulkDone(false);
    bulkAbort.current = false;

    for (let i = 0; i < tasks.length; i++) {
      if (bulkAbort.current) break;
      const t = tasks[i];

      // mark running
      setBulkTasks(prev => prev.map((x, idx) => idx === i ? { ...x, state: 'running' } : x));

      try {
        const r = await fetch(`/api/channels/${channel}/publish`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ productId: t.productId, shopId: t.shopId, priceOverride: t.price }),
        });
        const d = await r.json();

        if (r.status === 409) {
          setBulkTasks(prev => prev.map((x, idx) => idx === i ? { ...x, state: 'skip', message: 'Đã đăng trước đó' } : x));
        } else if (d.ok) {
          setBulkTasks(prev => prev.map((x, idx) => idx === i ? { ...x, state: 'ok', externalId: d.externalId, message: d.message } : x));
        } else {
          setBulkTasks(prev => prev.map((x, idx) => idx === i ? { ...x, state: 'error', message: d.error ?? d.message ?? 'Lỗi' } : x));
        }
      } catch {
        setBulkTasks(prev => prev.map((x, idx) => idx === i ? { ...x, state: 'error', message: 'Network error' } : x));
      }

      // Small delay between requests to avoid rate limiting
      if (i < tasks.length - 1) await new Promise(r => setTimeout(r, 300));
    }

    setBulkRunning(false);
    setBulkDone(true);
    await loadListings();
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const totalRevenue = shops.reduce((s, sh) => s + sh.revenue, 0);
  const totalOrders  = shops.reduce((s, sh) => s + sh.orders, 0);
  const activeShops  = shops.filter(s => s.status === 'active').length;
  const listingsByProduct = listings.reduce<Record<number, Listing[]>>((acc, l) => {
    if (!acc[l.product_id]) acc[l.product_id] = [];
    acc[l.product_id].push(l); return acc;
  }, {});

  const bulkPreviewTasks = buildTasks();
  const bulkOkCount = bulkTasks.filter(t => t.state === 'ok').length;
  const bulkErrCount = bulkTasks.filter(t => t.state === 'error').length;
  const bulkSkipCount = bulkTasks.filter(t => t.state === 'skip').length;
  const bulkDoneCount = bulkTasks.filter(t => t.state !== 'pending' && t.state !== 'running').length;

  const TABS: { id: Tab; icon: React.ReactNode; label: string }[] = [
    { id: 'shops',     icon: <Store size={14}/>,       label: 'Shops' },
    { id: 'products',  icon: <Tag size={14}/>,          label: 'Sản phẩm' },
    { id: 'orders',    icon: <ShoppingCart size={14}/>, label: 'Đơn hàng' },
    { id: 'promo',     icon: <Ticket size={14}/>,       label: 'Khuyến mãi' },
    { id: 'affiliate', icon: <Users size={14}/>,        label: 'Affiliate' },
    { id: 'live',      icon: <Video size={14}/>,         label: 'LIVE' },
    { id: 'ai',        icon: <Sparkles size={14}/>,     label: 'AI Hub' },
    { id: 'analytics', icon: <BarChart3 size={14}/>,    label: 'Phân tích' },
    { id: 'settings',  icon: <Settings size={14}/>,     label: 'Cài đặt' },
  ];

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 overflow-y-auto p-7 pb-10 relative">

      {/* ── Banner ─────────────────────────────────────────────────────────── */}
      {banner && (
        <div className="mb-4 rounded-[12px] px-4 py-3 flex items-center justify-between text-[13px] font-medium"
          style={{ background: banner.type === 'ok' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${banner.type === 'ok' ? '#bbf7d0' : '#fecaca'}`, color: banner.type === 'ok' ? '#15803d' : '#dc2626' }}>
          <span className="flex items-center gap-2">
            {banner.type === 'ok' ? <CheckCircle size={15}/> : <AlertTriangle size={15}/>}
            {banner.msg}
          </span>
          <button onClick={() => setBanner(null)}><X size={14}/></button>
        </div>
      )}

      {/* ── Platform Header ─────────────────────────────────────────────────── */}
      <div className="rounded-[18px] p-5 mb-5 flex items-center justify-between"
        style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', borderLeft: `4px solid ${color}` }}>
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-[14px] flex items-center justify-center flex-shrink-0" style={{ background: color }}>{logo}</div>
          <div>
            <h1 className="text-[20px] font-extrabold tracking-tight" style={{ color: 'var(--smc-text)' }}>{label}</h1>
            <p className="text-[13px] mt-0.5" style={{ color }}>
              {loadingShops ? 'Đang tải...' : `${shops.length} shop · ${activeShops} active · ${fmtMoney(totalRevenue)} doanh thu`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[14px] font-bold" style={{ color: 'var(--smc-text)' }}>{totalOrders.toLocaleString('vi-VN')} đơn</div>
            <div className="text-[11px]" style={{ color }}>tổng đơn hàng</div>
          </div>
          {configStatus && !configStatus.configured && (
            <span className="text-[11.5px] px-3 py-1.5 rounded-[8px] font-semibold" style={{ background: '#fef9c3', color: '#854d0e', border: '1px solid #fef08a' }}>
              ⚠ Chưa cấu hình API
            </span>
          )}
          <button onClick={() => setConnectOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold transition-opacity hover:opacity-85"
            style={{ background: color }}>
            <Plus size={15}/> Thêm shop
          </button>
        </div>
      </div>

      {/* ── Tab bar ─────────────────────────────────────────────────────────── */}
      <div className="flex gap-1 mb-5 p-1 rounded-[12px]"
        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[9px] text-[13px] font-medium transition-all flex-1 justify-center"
            style={tab === t.id ? { background: color, color: '#fff', fontWeight: 600 } : { color: 'var(--smc-text-3)' }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════ TAB: SHOPS ════════════════ */}
      {tab === 'shops' && (
        <div>
          {configStatus && !configStatus.configured && configStatus.setup && (
            <div className="rounded-[16px] p-5 mb-5" style={{ background: '#fffbeb', border: '1px solid #fef08a' }}>
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={16} className="text-amber-600"/>
                <span className="text-[14px] font-bold text-amber-800">{configStatus.setup.title}</span>
              </div>
              <p className="text-[12.5px] text-amber-700 mb-4">Chưa tìm thấy API credentials cho {label}. Làm theo các bước sau để kết nối:</p>
              <ol className="space-y-2">
                {configStatus.setup.steps.map((step, i) => (
                  <li key={i} className="flex items-start gap-3 text-[12.5px] text-amber-800">
                    <span className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold text-white" style={{ background: '#d97706' }}>{i + 1}</span>
                    <span className="leading-relaxed">{step}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-4 p-3 rounded-[10px] bg-amber-100 text-[12px] text-amber-800 font-mono">
                # .env.local<br/>
                {channel === 'tiktok' ? 'TIKTOK_APP_KEY=your_app_key\nTIKTOK_APP_SECRET=your_app_secret' : 'SHOPEE_PARTNER_ID=your_partner_id\nSHOPEE_PARTNER_KEY=your_partner_key'}
                <br/>APP_BASE_URL=https://your-domain.com
              </div>
            </div>
          )}

          {loadingShops ? (
            <div className="text-center py-16" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
          ) : shops.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: colorLight }}>{logo}</div>
              <div className="text-[16px] font-bold mb-2" style={{ color: 'var(--smc-text)' }}>Chưa có shop nào</div>
              <p className="text-[13px] mb-5" style={{ color: 'var(--smc-text-3)' }}>Kết nối {label} đầu tiên để bắt đầu quản lý</p>
              <button onClick={() => setConnectOpen(true)} className="px-6 py-2.5 rounded-[10px] text-white font-semibold" style={{ background: color }}>Kết nối {label}</button>
            </div>
          ) : (
            <div className="space-y-3">
              {shops.map(shop => {
                const ts = tokenState(shop.token_expires_at);
                const StatusIcon = STATUS_ICON[shop.status] ?? AlertCircle;
                const daysLeft = shop.token_expires_at ? Math.max(0, Math.round((new Date(shop.token_expires_at).getTime() - Date.now()) / 86400000)) : null;
                return (
                  <div key={shop.id} className="rounded-[16px] p-4"
                    style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', boxShadow: '0 2px 8px var(--smc-shadow)' }}>
                    <div className="flex items-start gap-4">
                      <div className="w-11 h-11 rounded-[12px] flex items-center justify-center flex-shrink-0 text-[16px] font-bold text-white" style={{ background: color }}>
                        {shop.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[14px] font-bold truncate" style={{ color: 'var(--smc-text)' }}>{shop.name}</span>
                          <span className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: STATUS_COLOR[shop.status] }}>
                            <StatusIcon size={11}/> {STATUS_LABEL[shop.status]}
                          </span>
                          {ts === 'soon' && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fffbeb', color: '#92400e', border: '1px solid #fef08a' }}>⚡ Token còn {daysLeft}n</span>}
                          {ts === 'expired' && <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>🔑 Token hết hạn</span>}
                        </div>
                        <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                          <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--smc-text-3)' }}><Package size={11}/>{shop.listing_count} SP</span>
                          <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--smc-text-3)' }}><ShoppingCart size={11}/>{shop.orders} đơn</span>
                          <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--smc-text-3)' }}><TrendingUp size={11}/>{fmtMoney(shop.revenue)}</span>
                          <span className="text-[12px] flex items-center gap-1" style={{ color: 'var(--smc-text-3)' }}><Clock size={11}/>Sync {fmtTime(shop.last_sync_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {(ts === 'soon' || ts === 'expired') && (
                          <button onClick={() => refreshToken(shop.id)} disabled={refreshing === shop.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80"
                            style={{ color: color, borderColor: colorBorder, background: 'var(--smc-surface-3)' }}>
                            <KeyRound size={12}/>{refreshing === shop.id ? 'Đang làm mới...' : 'Làm mới token'}
                          </button>
                        )}
                        <button onClick={() => syncShop(shop.id)} disabled={syncing === shop.id}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80"
                          style={{ color: 'var(--smc-text-2)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}>
                          <RefreshCw size={12} className={syncing === shop.id ? 'animate-spin' : ''}/>{syncing === shop.id ? 'Syncing...' : 'Sync'}
                        </button>
                      </div>
                    </div>
                    {shop.token_expires_at && ts !== 'none' && (
                      <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--smc-border)' }}>
                        <div className="flex justify-between text-[11px] mb-1">
                          <span style={{ color: 'var(--smc-text-4)' }}>Token OAuth</span>
                          <span style={{ color: TOKEN_COLOR[ts] }}>
                            {ts === 'ok' ? `Còn ${daysLeft} ngày` : ts === 'soon' ? `Sắp hết — còn ${daysLeft} ngày` : 'Đã hết hạn'}
                          </span>
                        </div>
                        <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, Math.max(0, (daysLeft ?? 0) / 30 * 100))}%`, background: TOKEN_COLOR[ts] }}/>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={() => setConnectOpen(true)}
                className="w-full rounded-[16px] p-4 flex items-center justify-center gap-2 text-[13px] font-medium border-2 border-dashed transition-all hover:opacity-70"
                style={{ borderColor: colorBorder, color: color }}>
                <Plus size={16}/> Kết nối thêm shop {label}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAB: PRODUCTS ════════════════ */}
      {tab === 'products' && (
        <div>
          {/* Filter bar */}
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-[300px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--smc-text-4)' }}/>
              <input value={prodQ} onChange={e => setProdQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadProducts()}
                placeholder={`Tìm sản phẩm...`}
                className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px] outline-none"
                style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
            </div>
            <select value={selectedShop} onChange={e => setSelectedShop(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
              <option value="">Tất cả shop</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button onClick={loadProducts} className="px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold" style={{ background: color }}>Tìm</button>
            <div className="flex-1"/>
            {/* Bulk publish trigger */}
            {selectedIds.size > 0 && (
              <button onClick={openBulkModal}
                className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13px] font-bold transition-all hover:opacity-85 animate-pulse-once"
                style={{ background: color }}>
                <Layers size={15}/> Đăng {selectedIds.size} SP lên {label}
              </button>
            )}
            <button onClick={openCreateProduct}
              className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold"
              style={{ background: color }}>
              <Plus size={15}/> Thêm sản phẩm
            </button>
          </div>

          {/* Listing stats */}
          <div className="flex items-center gap-3 mb-4">
            {[
              { label: 'Đang bán', count: listings.filter(l => l.status === 'active').length, color: '#16a34a' },
              { label: 'Chờ duyệt', count: listings.filter(l => l.status === 'pending').length, color: '#d97706' },
              { label: 'Bị từ chối', count: listings.filter(l => l.status === 'rejected').length, color: '#dc2626' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: s.color }}>
                <span className="w-2 h-2 rounded-full" style={{ background: s.color }}/>{s.label}: {s.count}
              </div>
            ))}
            {selectedIds.size > 0 && (
              <div className="ml-auto flex items-center gap-2 text-[12.5px]" style={{ color }}>
                <CheckSquare size={13}/> Đã chọn {selectedIds.size} / {products.length} sản phẩm
                <button onClick={() => setSelectedIds(new Set())} className="text-[11px] underline" style={{ color: 'var(--smc-text-4)' }}>Bỏ chọn</button>
              </div>
            )}
          </div>

          {/* Products table */}
          <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                  {/* Select-all checkbox */}
                  <th className="px-4 py-3 w-10">
                    <button onClick={toggleSelectAll} className="flex items-center justify-center w-5 h-5">
                      {selectedIds.size === products.length && products.length > 0
                        ? <CheckSquare size={16} style={{ color }}/>
                        : selectedIds.size > 0
                        ? <div className="w-4 h-4 rounded border-2 flex items-center justify-center" style={{ borderColor: color, background: color + '30' }}><div className="w-2 h-0.5 rounded" style={{ background: color }}/></div>
                        : <Square size={16} style={{ color: 'var(--smc-text-4)' }}/>
                      }
                    </button>
                  </th>
                  {['Sản phẩm', 'Giá', 'Tồn', 'Đã bán', `Listing trên ${label}`, 'Thao tác'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingProds ? (
                  <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Chưa có sản phẩm</td></tr>
                ) : products.map(p => {
                  const pListings = listingsByProduct[p.id] ?? [];
                  const isSelected = selectedIds.has(p.id);
                  return (
                    <tr key={p.id}
                      style={{ borderBottom: '1px solid var(--smc-border)', background: isSelected ? 'var(--smc-nav-active)' : undefined, cursor: 'pointer' }}
                      onClick={() => toggleSelect(p.id)}>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button onClick={() => toggleSelect(p.id)} className="flex items-center justify-center w-5 h-5">
                          {isSelected ? <CheckSquare size={16} style={{ color }}/> : <Square size={16} style={{ color: 'var(--smc-text-4)' }}/>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-[13px] truncate max-w-[200px]" style={{ color: 'var(--smc-text)' }}>{p.name}</div>
                        <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{p.sku} · {p.category}</div>
                      </td>
                      <td className="px-4 py-3 text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--smc-text)' }}>
                        {(p.sale_price || p.price).toLocaleString('vi-VN')}đ
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: p.stock === 0 ? '#dc2626' : p.stock < 50 ? '#d97706' : '#16a34a' }}>
                        {p.stock}
                      </td>
                      <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--smc-text-2)' }}>{p.total_sales}</td>
                      <td className="px-4 py-3">
                        {pListings.length === 0 ? (
                          <span className="text-[11.5px]" style={{ color: 'var(--smc-text-4)' }}>Chưa đăng</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {pListings.map(l => {
                              const ls = LISTING_STATUS[l.status] ?? LISTING_STATUS.inactive;
                              return (
                                <span key={l.id}
                                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full cursor-pointer"
                                  style={{ background: ls.bg, color: ls.color }}
                                  title={`${l.shop_name} · ID: ${l.external_id || '—'}`}
                                  onClick={e => { e.stopPropagation(); toggleListing(l.id, l.status); }}>
                                  {togglingListing === l.id ? '...' : ls.label}
                                </span>
                              );
                            })}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEditProduct(p)}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80"
                            style={{ color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}>
                            <Edit3 size={11}/> Sửa
                          </button>
                          <button onClick={() => openPublishDrawer(p)} disabled={shops.length === 0}
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80 disabled:opacity-40"
                            style={{ color, borderColor: colorBorder, background: 'transparent' }}>
                            <Zap size={12}/>{pListings.length > 0 ? 'Đăng' : 'Đăng'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Floating bulk bar */}
          {selectedIds.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-4 px-6 py-3.5 rounded-[16px] shadow-2xl"
              style={{ background: colorDark, color: '#fff', minWidth: 400 }}>
              <CheckSquare size={16}/>
              <span className="text-[13.5px] font-semibold flex-1">Đã chọn {selectedIds.size} sản phẩm</span>
              <button onClick={() => setSelectedIds(new Set())}
                className="text-[12px] opacity-70 hover:opacity-100 px-3 py-1.5 rounded-[8px] border border-white/20">
                Bỏ chọn
              </button>
              <button onClick={openBulkModal}
                className="flex items-center gap-2 px-4 py-1.5 rounded-[10px] font-bold text-[13px]"
                style={{ background: '#fff', color: colorDark }}>
                <Layers size={14}/> Bulk đăng lên {label}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAB: ORDERS ════════════════ */}
      {tab === 'orders' && (
        <div>
          {/* Sub-tab: Đơn hàng / Hoàn trả */}
          <div className="flex gap-2 mb-4">
            {[
              { id: 'list' as const, icon: <ShoppingCart size={13}/>, label: 'Đơn hàng' },
              { id: 'returns' as const, icon: <RotateCcwSquare size={13}/>, label: `Hoàn trả${returnsStats?.pending_count ? ` (${returnsStats.pending_count})` : ''}` },
            ].map(st => (
              <button key={st.id} onClick={() => { setOrdersSubTab(st.id); if (st.id === 'returns') loadReturns(); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-all"
                style={ordersSubTab === st.id
                  ? { background: color, color: '#fff', borderColor: color }
                  : { background: 'var(--smc-surface)', color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)' }}>
                {st.icon}{st.label}
              </button>
            ))}
          </div>

          {/* Returns sub-tab */}
          {ordersSubTab === 'returns' && (
            <div>
              <div className="flex gap-3 mb-4">
                <select value={returnStatusFilter} onChange={e => { setReturnStatusFilter(e.target.value); }}
                  className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="">Tất cả trạng thái</option>
                  <option value="pending">Chờ xử lý</option>
                  <option value="approved">Đã duyệt</option>
                  <option value="rejected">Từ chối</option>
                  <option value="resolved">Hoàn thành</option>
                </select>
                <button onClick={loadReturns} className="px-3 py-2 rounded-[10px] text-[13px] font-semibold border"
                  style={{ color, borderColor: colorBorder, background: 'var(--smc-surface-3)' }}>
                  <RefreshCw size={14}/>
                </button>
                {returnsStats && (
                  <div className="flex items-center gap-4 ml-2">
                    {[
                      { label: 'Tổng YC', value: returnsStats.total },
                      { label: 'Chờ xử lý', value: returnsStats.pending_count, alert: true },
                      { label: 'Tổng hoàn tiền', value: fmtMoney(returnsStats.total_refund ?? 0) },
                    ].map((k, i) => (
                      <div key={i} className="text-[12px]">
                        <span style={{ color: 'var(--smc-text-4)' }}>{k.label}: </span>
                        <span className="font-bold" style={{ color: k.alert && returnsStats.pending_count > 0 ? '#ef4444' : color }}>{k.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {loadingReturns ? (
                <div className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
              ) : returnsList.length === 0 ? (
                <div className="text-center py-16">
                  <RotateCcwSquare size={36} className="mx-auto mb-3" style={{ color: colorBorder }}/>
                  <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--smc-text)' }}>Chưa có yêu cầu hoàn trả nào</div>
                </div>
              ) : (
                <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                        {['Đơn hàng', 'Khách hàng', 'Lý do', 'Hoàn tiền', 'Trạng thái', 'Thao tác'].map((h, i) => (
                          <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {returnsList.map(ret => {
                        const statusMap: Record<string, { label: string; bg: string; c: string }> = {
                          pending:  { label: 'Chờ xử lý', bg: '#fffbeb', c: '#d97706' },
                          approved: { label: 'Đã duyệt',  bg: '#eff6ff', c: '#2563eb' },
                          rejected: { label: 'Từ chối',   bg: '#fef2f2', c: '#dc2626' },
                          resolved: { label: 'Hoàn thành',bg: '#f0fdf4', c: '#16a34a' },
                        };
                        const s = statusMap[ret.status] ?? statusMap.pending;
                        return (
                          <tr key={ret.id} style={{ borderBottom: '1px solid var(--smc-border)' }}>
                            <td className="px-4 py-3">
                              <div className="text-[13px] font-semibold" style={{ color }}>{ret.order_no}</div>
                              <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{ret.shop_name}</div>
                            </td>
                            <td className="px-4 py-3 text-[13px]" style={{ color: 'var(--smc-text)' }}>{ret.customer_name}</td>
                            <td className="px-4 py-3 text-[12px] max-w-[160px] truncate" style={{ color: 'var(--smc-text-3)' }}>{ret.reason}</td>
                            <td className="px-4 py-3 text-[13px] font-bold" style={{ color }}>{fmtMoney(ret.refund_amount)}</td>
                            <td className="px-4 py-3">
                              <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.c }}>{s.label}</span>
                            </td>
                            <td className="px-4 py-3">
                              {ret.status === 'pending' && (
                                <div className="flex gap-1">
                                  <button onClick={() => resolveReturn(ret.id, 'approved')}
                                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold text-white"
                                    style={{ background: '#16a34a' }}><PackageCheck size={11}/> Duyệt</button>
                                  <button onClick={() => resolveReturn(ret.id, 'rejected')}
                                    className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold text-white"
                                    style={{ background: '#dc2626' }}><PackageX size={11}/> Từ chối</button>
                                </div>
                              )}
                              {ret.status === 'approved' && (
                                <button onClick={() => resolveReturn(ret.id, 'resolved')}
                                  className="flex items-center gap-1 px-2 py-1 rounded-[6px] text-[11px] font-semibold border"
                                  style={{ color, borderColor: colorBorder, background: 'transparent' }}>
                                  <CheckCircle size={11}/> Hoàn thành
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Main orders list */}
          {ordersSubTab === 'list' && <div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1 max-w-[320px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--smc-text-4)' }}/>
              <input value={orderQ} onChange={e => setOrderQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && loadOrders()}
                placeholder="Tìm đơn hàng, khách hàng..."
                className="w-full pl-9 pr-3 py-2 rounded-[10px] text-[13px] outline-none"
                style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
            </div>
            <select value={orderStatus} onChange={e => setOrderStatus(e.target.value)}
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
              <option value="">Tất cả trạng thái</option>
              {Object.entries(ORDER_STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={loadOrders} className="px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold" style={{ background: color }}>Tìm</button>
          </div>
          <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                  {['Mã đơn', 'Khách hàng', 'Shop', 'Giá trị', 'Trạng thái', 'Ngày tạo', 'Thao tác'].map((h, i) => (
                    <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loadingOrders ? (
                  <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</td></tr>
                ) : orders.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Chưa có đơn hàng nào</td></tr>
                ) : orders.map(o => {
                  const st = ORDER_STATUS[o.status] ?? { label: o.status, color: '#64748b' };
                  return (
                    <tr key={o.id} style={{ borderBottom: '1px solid var(--smc-border)' }}>
                      <td className="px-4 py-3 text-[13px] font-mono font-semibold" style={{ color }}>{o.order_no}</td>
                      <td className="px-4 py-3">
                        <div className="text-[13px] font-medium" style={{ color: 'var(--smc-text)' }}>{o.customer_name}</div>
                        {o.customer_phone && <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{o.customer_phone}</div>}
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{o.shop_name}</td>
                      <td className="px-4 py-3 text-[13px] font-semibold whitespace-nowrap" style={{ color: 'var(--smc-text)' }}>{o.total.toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-3">
                        <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full border"
                          style={{ color: st.color, borderColor: st.color + '40', background: st.color + '12' }}>
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{o.created_at.slice(0, 10)}</td>
                      <td className="px-4 py-3">
                        {o.status === 'awaiting_shipment' && (
                          <button onClick={() => confirmShipment(o.id)} disabled={confirmingShipment === o.id}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white transition-all hover:opacity-80"
                            style={{ background: color }}>
                            <Truck size={11}/>{confirmingShipment === o.id ? 'Đang xử lý...' : 'Xác nhận giao'}
                          </button>
                        )}
                        {o.status === 'new' && (
                          <button className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border"
                            style={{ color: '#2563eb', borderColor: '#bfdbfe', background: '#eff6ff' }}>
                            <CheckSquare size={11}/> Xác nhận đơn
                          </button>
                        )}
                        {(o.status === 'shipped' || o.status === 'delivered') && (
                          <button className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border"
                            style={{ color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                            <Eye size={11}/> Theo dõi
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          </div>}
        </div>
      )}

      {/* ════════════════ TAB: PROMO ════════════════ */}
      {tab === 'promo' && (
        <div>
          {/* Sub-tab bar */}
          <div className="flex gap-2 mb-5">
            {([
              { id: 'deals' as const, icon: <Flame size={14}/>, label: 'Flash Deal' },
              { id: 'vouchers' as const, icon: <Ticket size={14}/>, label: 'Voucher' },
            ]).map(st => (
              <button key={st.id} onClick={() => setPromoTab(st.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-all"
                style={promoTab === st.id
                  ? { background: color, color: '#fff', borderColor: color }
                  : { background: 'var(--smc-surface)', color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)' }}>
                {st.icon}{st.label}
              </button>
            ))}
          </div>

          {/* ── Flash Deals ── */}
          {promoTab === 'deals' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <select value={dealFilterShop} onChange={e => setDealFilterShop(e.target.value ? Number(e.target.value) : '')}
                  className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="">Tất cả shop</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={loadDeals} className="px-3 py-2 rounded-[10px] text-[13px] font-semibold border transition-all hover:opacity-80"
                  style={{ color: 'var(--smc-text-2)', borderColor: 'var(--smc-border)' }}>
                  <RefreshCw size={13}/>
                </button>
                <div className="flex-1"/>
                <button onClick={() => { setDealForm({ shopId: shops[0]?.id ?? '', name: '', discountType: 'percent', discountValue: '', minPurchase: '', maxDiscount: '', startAt: '', endAt: '' }); setDealError(''); setDealFormOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold"
                  style={{ background: color }}>
                  <Plus size={15}/> Tạo Flash Deal
                </button>
              </div>

              {/* Stats */}
              <div className="flex gap-3 mb-4">
                {[
                  { label: 'Đang chạy', count: deals.filter(d => d.status === 'active').length, color: '#16a34a' },
                  { label: 'Lên lịch', count: deals.filter(d => d.status === 'scheduled').length, color: '#2563eb' },
                  { label: 'Đã kết thúc', count: deals.filter(d => d.status === 'ended' || d.status === 'cancelled').length, color: '#94a3b8' },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                    style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: s.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }}/>{s.label}: {s.count}
                  </div>
                ))}
              </div>

              {loadingDeals ? (
                <div className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
              ) : deals.length === 0 ? (
                <div className="text-center py-16">
                  <Flame size={36} className="mx-auto mb-3" style={{ color: colorBorder }}/>
                  <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--smc-text)' }}>Chưa có Flash Deal nào</div>
                  <p className="text-[13px] mb-4" style={{ color: 'var(--smc-text-3)' }}>Tạo Flash Deal để tăng doanh thu nhanh chóng</p>
                  <button onClick={() => { setDealForm({ shopId: shops[0]?.id ?? '', name: '', discountType: 'percent', discountValue: '', minPurchase: '', maxDiscount: '', startAt: '', endAt: '' }); setDealError(''); setDealFormOpen(true); }}
                    className="px-5 py-2 rounded-[10px] text-white font-semibold text-[13px]"
                    style={{ background: color }}>
                    Tạo Flash Deal đầu tiên
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {deals.map(deal => {
                    const now = Date.now();
                    const start = new Date(deal.start_at).getTime();
                    const end = new Date(deal.end_at).getTime();
                    const isLive = now >= start && now <= end && deal.status === 'active';
                    const pct = end > start ? Math.min(100, Math.max(0, (now - start) / (end - start) * 100)) : 0;
                    const DEAL_STATUS: Record<string, { label: string; color: string; bg: string }> = {
                      active:    { label: isLive ? '🔴 LIVE' : 'Đang hoạt động', color: '#16a34a', bg: '#f0fdf4' },
                      scheduled: { label: '📅 Lên lịch', color: '#2563eb', bg: '#eff6ff' },
                      ended:     { label: 'Đã kết thúc', color: '#94a3b8', bg: '#f8fafc' },
                      cancelled: { label: 'Đã huỷ', color: '#dc2626', bg: '#fef2f2' },
                    };
                    const ds = DEAL_STATUS[deal.status] ?? DEAL_STATUS.scheduled;
                    return (
                      <div key={deal.id} className="rounded-[16px] p-4"
                        style={{ background: 'var(--smc-surface)', border: `1px solid ${isLive ? colorBorder : 'var(--smc-border)'}`, boxShadow: isLive ? `0 0 0 2px ${color}20` : undefined }}>
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0"
                            style={{ background: isLive ? color : colorLight }}>
                            <Flame size={18} style={{ color: isLive ? '#fff' : color }}/>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[14px] font-bold" style={{ color: 'var(--smc-text)' }}>{deal.name}</span>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: ds.bg, color: ds.color }}>{ds.label}</span>
                            </div>
                            <div className="flex items-center gap-4 mt-1 flex-wrap text-[12px]" style={{ color: 'var(--smc-text-3)' }}>
                              <span><Store size={11} className="inline mr-1"/>{deal.shop_name}</span>
                              <span className="font-semibold" style={{ color }}>
                                {deal.discount_type === 'percent' ? `-${deal.discount_value}%` : `-${deal.discount_value.toLocaleString('vi-VN')}đ`}
                              </span>
                              {deal.min_purchase > 0 && <span>Đơn tối thiểu: {deal.min_purchase.toLocaleString('vi-VN')}đ</span>}
                              <span><Calendar size={11} className="inline mr-1"/>{deal.start_at.slice(0, 16)} → {deal.end_at.slice(0, 16)}</span>
                            </div>
                            {isLive && (
                              <div className="mt-2">
                                <div className="flex justify-between text-[11px] mb-1" style={{ color: 'var(--smc-text-4)' }}>
                                  <span>Thời gian còn lại</span>
                                  <span style={{ color }}>{Math.max(0, Math.round((end - now) / 60000))} phút</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {(deal.status === 'active' || deal.status === 'scheduled') && (
                              <button onClick={() => toggleDeal(deal.id, deal.status)}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border transition-all hover:opacity-80"
                                style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>
                                <X size={12}/> Huỷ
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Vouchers ── */}
          {promoTab === 'vouchers' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <select value={voucherFilterShop} onChange={e => setVoucherFilterShop(e.target.value ? Number(e.target.value) : '')}
                  className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="">Tất cả shop</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button onClick={loadVouchers} className="px-3 py-2 rounded-[10px] text-[13px] font-semibold border transition-all hover:opacity-80"
                  style={{ color: 'var(--smc-text-2)', borderColor: 'var(--smc-border)' }}>
                  <RefreshCw size={13}/>
                </button>
                <div className="flex-1"/>
                <button onClick={() => { setVoucherForm({ shopId: shops[0]?.id ?? '', code: '', discountType: 'percent', discountValue: '', minPurchase: '', maxDiscount: '', usageLimit: '100', startAt: '', endAt: '' }); setVoucherError(''); setVoucherFormOpen(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold"
                  style={{ background: color }}>
                  <Plus size={15}/> Tạo Voucher
                </button>
              </div>

              {/* Voucher stats */}
              <div className="flex gap-3 mb-4">
                {[
                  { label: 'Đang hoạt động', count: vouchers.filter(v => v.status === 'active').length, color: '#16a34a' },
                  { label: 'Tạm dừng', count: vouchers.filter(v => v.status === 'inactive').length, color: '#d97706' },
                  { label: 'Đã dùng', count: vouchers.reduce((s, v) => s + v.usage_count, 0), color: color },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold"
                    style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: s.color }}>
                    <span className="w-2 h-2 rounded-full" style={{ background: s.color }}/>{s.label}: {s.count}
                  </div>
                ))}
              </div>

              {loadingVouchers ? (
                <div className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
              ) : vouchers.length === 0 ? (
                <div className="text-center py-16">
                  <Ticket size={36} className="mx-auto mb-3" style={{ color: colorBorder }}/>
                  <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--smc-text)' }}>Chưa có voucher nào</div>
                  <p className="text-[13px] mb-4" style={{ color: 'var(--smc-text-3)' }}>Tạo voucher để thu hút và giữ chân khách hàng</p>
                  <button onClick={() => { setVoucherForm({ shopId: shops[0]?.id ?? '', code: '', discountType: 'percent', discountValue: '', minPurchase: '', maxDiscount: '', usageLimit: '100', startAt: '', endAt: '' }); setVoucherError(''); setVoucherFormOpen(true); }}
                    className="px-5 py-2 rounded-[10px] text-white font-semibold text-[13px]"
                    style={{ background: color }}>
                    Tạo voucher đầu tiên
                  </button>
                </div>
              ) : (
                <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <table className="w-full">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                        {['Mã voucher', 'Shop', 'Giảm giá', 'Điều kiện', 'Sử dụng', 'Hiệu lực', 'Trạng thái', ''].map((h, i) => (
                          <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {vouchers.map(v => {
                        const usagePct = v.usage_limit > 0 ? (v.usage_count / v.usage_limit) * 100 : 0;
                        const VSTATUS: Record<string, { label: string; color: string }> = {
                          active:   { label: 'Đang chạy', color: '#16a34a' },
                          inactive: { label: 'Tạm dừng', color: '#d97706' },
                          cancelled:{ label: 'Đã huỷ', color: '#dc2626' },
                          expired:  { label: 'Hết hạn', color: '#94a3b8' },
                        };
                        const vs = VSTATUS[v.status] ?? { label: v.status, color: '#94a3b8' };
                        return (
                          <tr key={v.id} style={{ borderBottom: '1px solid var(--smc-border)' }}>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-[13px] px-2 py-0.5 rounded-[6px]"
                                  style={{ background: colorLight, color: colorDark }}>{v.code}</span>
                                <button onClick={() => navigator.clipboard.writeText(v.code)}
                                  className="hover:opacity-70" title="Copy">
                                  <Copy size={11} style={{ color: 'var(--smc-text-4)' }}/>
                                </button>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{v.shop_name}</td>
                            <td className="px-4 py-3">
                              <span className="text-[13px] font-bold" style={{ color }}>
                                {v.discount_type === 'percent' ? `-${v.discount_value}%` : `-${v.discount_value.toLocaleString('vi-VN')}đ`}
                              </span>
                              {v.max_discount > 0 && <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>Tối đa {v.max_discount.toLocaleString('vi-VN')}đ</div>}
                            </td>
                            <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>
                              {v.min_purchase > 0 ? `Đơn ≥ ${v.min_purchase.toLocaleString('vi-VN')}đ` : 'Không giới hạn'}
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-[12px] font-medium" style={{ color: 'var(--smc-text)' }}>{v.usage_count} / {v.usage_limit}</div>
                              <div className="mt-1 h-1 rounded-full overflow-hidden w-16" style={{ background: 'var(--smc-border)' }}>
                                <div className="h-full rounded-full" style={{ width: `${usagePct}%`, background: usagePct >= 80 ? '#dc2626' : color }}/>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-[11.5px]" style={{ color: 'var(--smc-text-3)' }}>
                              <div>{v.start_at.slice(0, 10)}</div>
                              <div>→ {v.end_at.slice(0, 10)}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full border"
                                style={{ color: vs.color, borderColor: vs.color + '40', background: vs.color + '12' }}>
                                {vs.label}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {(v.status === 'active' || v.status === 'inactive') && (
                                <button onClick={() => toggleVoucher(v.id, v.status)}
                                  className="flex items-center gap-1 px-2 py-1 rounded-[7px] text-[11.5px] font-semibold border transition-all hover:opacity-80"
                                  style={v.status === 'active'
                                    ? { color: '#d97706', borderColor: '#fef08a', background: '#fffbeb' }
                                    : { color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                                  {v.status === 'active' ? <><ToggleRight size={12}/> Tắt</> : <><ToggleLeft size={12}/> Bật</>}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════ TAB: AFFILIATE ════════════════ */}
      {tab === 'affiliate' && (
        <div>
          {/* Sub-tab */}
          <div className="flex gap-2 mb-5">
            {([
              { id: 'products' as const, icon: <Package size={14}/>, label: 'Sản phẩm Affiliate' },
              { id: 'creators' as const, icon: <Star size={14}/>, label: 'KOC / Creator' },
            ]).map(st => (
              <button key={st.id} onClick={() => setAffiliateTab(st.id)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold border transition-all"
                style={affiliateTab === st.id
                  ? { background: color, color: '#fff', borderColor: color }
                  : { background: 'var(--smc-surface)', color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)' }}>
                {st.icon}{st.label}
              </button>
            ))}
            <div className="flex-1"/>
            <select value={affiliateShopId} onChange={e => setAffiliateShopId(e.target.value ? Number(e.target.value) : '')}
              className="px-3 py-2 rounded-[10px] text-[13px] outline-none"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
              <option value="">Tất cả shop</option>
              {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            {affiliateTab === 'products' && (
              <button onClick={() => { setEnrollShopId(shops[0]?.id ?? ''); setEnrollProductId(''); setEnrollRate('10'); setEnrollError(''); setEnrollOpen(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold"
                style={{ background: color }}>
                <Plus size={15}/> Đăng ký Affiliate
              </button>
            )}
          </div>

          {/* Overview stats */}
          {affiliateStats && affiliateTab === 'products' && (
            <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { label: 'SP đang Affiliate', value: affiliateStats.enrolled, icon: <Package size={16}/>, suffix: '' },
                { label: 'Tổng lượt click', value: affiliateStats.total_clicks?.toLocaleString('vi-VN') ?? 0, icon: <MousePointer size={16}/>, suffix: '' },
                { label: 'Đơn Affiliate', value: affiliateStats.total_conversions, icon: <ShoppingBag size={16}/>, suffix: '' },
                { label: 'Doanh thu Affiliate', value: fmtMoney(affiliateStats.total_revenue ?? 0), icon: <TrendingUp size={16}/>, suffix: '' },
              ].map((kpi, i) => (
                <div key={i} className="rounded-[14px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color }}>{kpi.icon}</span>
                    <span className="text-[11px]" style={{ color: 'var(--smc-text-3)' }}>{kpi.label}</span>
                  </div>
                  <div className="text-[20px] font-extrabold" style={{ color: 'var(--smc-text)' }}>{kpi.value}</div>
                  {affiliateStats.avg_commission > 0 && i === 0 && (
                    <div className="text-[11px] mt-0.5" style={{ color }}>
                      TB hoa hồng: {affiliateStats.avg_commission?.toFixed(1)}%
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {creatorStats && affiliateTab === 'creators' && (
            <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { label: 'Tổng creator', value: creatorStats.total_creators, icon: <Users size={16}/> },
                { label: 'Tổng GMV', value: fmtMoney(creatorStats.total_gmv ?? 0), icon: <TrendingUp size={16}/> },
                { label: 'Đơn từ creator', value: creatorStats.total_orders, icon: <ShoppingBag size={16}/> },
                { label: 'Hoa hồng đã trả', value: fmtMoney(creatorStats.total_commission ?? 0), icon: <Award size={16}/> },
              ].map((kpi, i) => (
                <div key={i} className="rounded-[14px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <div className="flex items-center gap-2 mb-2">
                    <span style={{ color }}>{kpi.icon}</span>
                    <span className="text-[11px]" style={{ color: 'var(--smc-text-3)' }}>{kpi.label}</span>
                  </div>
                  <div className="text-[20px] font-extrabold" style={{ color: 'var(--smc-text)' }}>{kpi.value}</div>
                </div>
              ))}
            </div>
          )}

          {/* ── Products tab ── */}
          {affiliateTab === 'products' && (
            loadingAffiliate ? (
              <div className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
            ) : affiliateProducts.length === 0 ? (
              <div className="text-center py-16">
                <Link size={36} className="mx-auto mb-3" style={{ color: colorBorder }}/>
                <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--smc-text)' }}>Chưa có SP nào trong Affiliate</div>
                <p className="text-[13px] mb-4" style={{ color: 'var(--smc-text-3)' }}>Đăng ký sản phẩm vào chương trình Affiliate để KOC promote</p>
                <button onClick={() => { setEnrollShopId(shops[0]?.id ?? ''); setEnrollProductId(''); setEnrollRate('10'); setEnrollError(''); setEnrollOpen(true); }}
                  className="px-5 py-2 rounded-[10px] text-white font-semibold text-[13px]"
                  style={{ background: color }}>
                  Đăng ký SP đầu tiên
                </button>
              </div>
            ) : (
              <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <table className="w-full">
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                      {['Sản phẩm', 'Shop', 'Hoa hồng', 'Clicks', 'Đơn', 'Doanh thu Affiliate', 'Trạng thái', ''].map((h, i) => (
                        <th key={i} className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {affiliateProducts.map(ap => {
                      const cvr = ap.clicks > 0 ? ((ap.conversions / ap.clicks) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={ap.id} style={{ borderBottom: '1px solid var(--smc-border)' }}>
                          <td className="px-4 py-3">
                            <div className="font-semibold text-[13px] truncate max-w-[160px]" style={{ color: 'var(--smc-text)' }}>{ap.product_name}</div>
                            <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{ap.sku}</div>
                          </td>
                          <td className="px-4 py-3 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{ap.shop_name}</td>
                          <td className="px-4 py-3">
                            {editingCommission?.id === ap.id ? (
                              <div className="flex items-center gap-1">
                                <input type="number" min={0} max={80}
                                  value={editingCommission.rate}
                                  onChange={e => setEditingCommission({ id: ap.id, rate: Number(e.target.value) })}
                                  className="w-16 px-2 py-1 rounded-[6px] text-[12px] outline-none"
                                  style={{ background: 'var(--smc-surface)', border: `1px solid ${color}`, color: 'var(--smc-text)' }}/>
                                <span className="text-[12px]" style={{ color: 'var(--smc-text-3)' }}>%</span>
                                <button onClick={() => updateCommission(ap.id, editingCommission.rate)}
                                  className="px-2 py-1 rounded-[6px] text-[11px] text-white font-semibold" style={{ background: color }}>✓</button>
                                <button onClick={() => setEditingCommission(null)}
                                  className="px-2 py-1 rounded-[6px] text-[11px]" style={{ color: 'var(--smc-text-4)' }}>✕</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-[14px] font-bold" style={{ color }}>{ap.commission_rate}%</span>
                                <button onClick={() => setEditingCommission({ id: ap.id, rate: ap.commission_rate })}
                                  className="hover:opacity-70" title="Chỉnh hoa hồng">
                                  <Edit3 size={11} style={{ color: 'var(--smc-text-4)' }}/>
                                </button>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{ap.clicks.toLocaleString('vi-VN')}</div>
                            <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>CVR {cvr}%</div>
                          </td>
                          <td className="px-4 py-3 text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{ap.conversions}</td>
                          <td className="px-4 py-3">
                            <div className="text-[13px] font-bold" style={{ color }}>{fmtMoney(ap.revenue)}</div>
                            <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>
                              Hoa hồng: {fmtMoney(ap.revenue * ap.commission_rate / 100)}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11.5px] font-semibold px-2 py-0.5 rounded-full"
                              style={ap.status === 'active'
                                ? { background: '#f0fdf4', color: '#16a34a' }
                                : { background: '#fffbeb', color: '#d97706' }}>
                              {ap.status === 'active' ? 'Đang chạy' : 'Tạm dừng'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => toggleAffiliateProduct(ap.id, ap.status)}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-[8px] text-[11.5px] font-semibold border transition-all hover:opacity-80"
                              style={ap.status === 'active'
                                ? { color: '#d97706', borderColor: '#fef08a', background: '#fffbeb' }
                                : { color: '#16a34a', borderColor: '#bbf7d0', background: '#f0fdf4' }}>
                              {ap.status === 'active' ? <><ToggleRight size={12}/> Dừng</> : <><ToggleLeft size={12}/> Bật</>}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── Creators tab ── */}
          {affiliateTab === 'creators' && (
            loadingAffiliate ? (
              <div className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
            ) : affiliateCreators.length === 0 ? (
              <div className="text-center py-16">
                <Star size={36} className="mx-auto mb-3" style={{ color: colorBorder }}/>
                <div className="text-[14px] font-semibold mb-1" style={{ color: 'var(--smc-text)' }}>Chưa có creator nào</div>
                <p className="text-[13px]" style={{ color: 'var(--smc-text-3)' }}>Đăng ký SP vào Affiliate để thu hút KOC/KOL promote</p>
              </div>
            ) : (
              <div className="space-y-3">
                {affiliateCreators.map((c, i) => {
                  const convRate = c.followers > 0 ? ((c.orders / c.followers) * 100).toFixed(2) : '0';
                  const rankColor = i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : 'var(--smc-text-4)';
                  return (
                    <div key={c.id} className="rounded-[16px] p-4 flex items-center gap-4"
                      style={{ background: 'var(--smc-surface)', border: `1px solid ${i < 3 ? colorBorder : 'var(--smc-border)'}` }}>
                      {/* Rank */}
                      <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-[14px]"
                        style={{ background: i < 3 ? colorLight : 'var(--smc-border)', color: rankColor }}>
                        {i + 1}
                      </div>
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-[15px] font-bold text-white"
                        style={{ background: color }}>
                        {c.creator_name.charAt(0)}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-bold" style={{ color: 'var(--smc-text)' }}>{c.creator_name}</span>
                          {c.creator_handle && (
                            <span className="text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{c.creator_handle}</span>
                          )}
                          {i < 3 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: colorLight, color: colorDark }}>
                              {i === 0 ? '🏆 Top 1' : i === 1 ? '🥈 Top 2' : '🥉 Top 3'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-[12px] flex-wrap" style={{ color: 'var(--smc-text-3)' }}>
                          <span><Users size={11} className="inline mr-1"/>{c.followers.toLocaleString('vi-VN')} followers</span>
                          <span><ShoppingBag size={11} className="inline mr-1"/>{c.orders} đơn</span>
                          <span className="font-semibold" style={{ color }}>GMV: {fmtMoney(c.gmv)}</span>
                          <span>CVR: {convRate}%</span>
                        </div>
                      </div>
                      {/* Commission */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-[14px] font-extrabold" style={{ color }}>{fmtMoney(c.commission_earned)}</div>
                        <div className="text-[11px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>hoa hồng</div>
                      </div>
                      <button className="flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold border flex-shrink-0"
                        style={{ color, borderColor: colorBorder, background: colorLight }}>
                        <ArrowUpRight size={12}/> Xem
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>
      )}

      {/* ════════════════ TAB: LIVE SCHEDULE ════════════════ */}
      {tab === 'live' && (() => {
        // Build 7 day slots for current week
        const weekStartDate = new Date();
        weekStartDate.setDate(weekStartDate.getDate() - weekStartDate.getDay() + 1 + liveWeek * 7);
        weekStartDate.setHours(0, 0, 0, 0);
        const weekDays = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(weekStartDate); d.setDate(weekStartDate.getDate() + i);
          return d;
        });
        const sessionsByDay = weekDays.map(day =>
          liveSessions.filter(s => {
            const sd = new Date(s.scheduled_at);
            return sd.getFullYear() === day.getFullYear() && sd.getMonth() === day.getMonth() && sd.getDate() === day.getDate();
          })
        );
        const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
        const today = new Date();

        return (
          <div>
            {/* Header bar */}
            <div className="flex items-center gap-3 mb-5">
              <button onClick={() => setLiveWeek(w => w - 1)}
                className="p-2 rounded-[10px] border transition-all hover:opacity-80"
                style={{ borderColor: 'var(--smc-border)', background: 'var(--smc-surface)', color: 'var(--smc-text-3)' }}>
                <ChevronLeft size={16}/>
              </button>
              <div className="flex-1 text-center text-[14px] font-bold" style={{ color: 'var(--smc-text)' }}>
                {weekStartDate.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })} –{' '}
                {weekDays[6].toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </div>
              <button onClick={() => setLiveWeek(w => w + 1)}
                className="p-2 rounded-[10px] border transition-all hover:opacity-80"
                style={{ borderColor: 'var(--smc-border)', background: 'var(--smc-surface)', color: 'var(--smc-text-3)' }}>
                <ChevronRightIcon size={16}/>
              </button>
              {liveWeek !== 0 && (
                <button onClick={() => setLiveWeek(0)} className="px-3 py-2 rounded-[10px] text-[12px] font-semibold border"
                  style={{ color, borderColor: colorBorder, background: colorLight }}>Tuần này</button>
              )}
              <button onClick={() => { setLiveForm({ shopId: shops[0]?.id ?? '', title: '', scheduledAt: '', durationMinutes: '60' }); setLiveFormOpen(true); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold"
                style={{ background: color }}>
                <Plus size={15}/> Lên lịch LIVE
              </button>
            </div>

            {/* KPI stats */}
            {liveStats && (
              <div className="grid gap-3 mb-5" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
                {[
                  { label: 'Phiên đã LIVE', value: liveStats.total, icon: <Video size={16}/> },
                  { label: 'Tổng lượt xem', value: (liveStats.total_viewers ?? 0).toLocaleString('vi-VN'), icon: <Users size={16}/> },
                  { label: 'Đơn từ LIVE', value: liveStats.total_orders ?? 0, icon: <ShoppingCart size={16}/> },
                  { label: 'GMV LIVE', value: fmtMoney(liveStats.total_gmv ?? 0), icon: <TrendingUp size={16}/> },
                ].map((k, i) => (
                  <div key={i} className="rounded-[14px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                    <div className="flex items-center gap-2 mb-2"><span style={{ color }}>{k.icon}</span><span className="text-[11px]" style={{ color: 'var(--smc-text-3)' }}>{k.label}</span></div>
                    <div className="text-[20px] font-extrabold" style={{ color: 'var(--smc-text)' }}>{k.value}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Weekly calendar grid */}
            {loadingLive ? (
              <div className="text-center py-10" style={{ color: 'var(--smc-text-4)' }}>Đang tải...</div>
            ) : (
              <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
                {weekDays.map((day, di) => {
                  const isToday = day.toDateString() === today.toDateString();
                  const daySessions = sessionsByDay[di];
                  return (
                    <div key={di} className="rounded-[14px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: `1px solid ${isToday ? color : 'var(--smc-border)'}` }}>
                      {/* Day header */}
                      <div className="px-3 py-2 text-center" style={{ background: isToday ? color : 'var(--smc-surface)', borderBottom: '1px solid var(--smc-border)' }}>
                        <div className="text-[11px] font-bold" style={{ color: isToday ? '#fff' : 'var(--smc-text-4)' }}>{DAY_LABELS[di]}</div>
                        <div className="text-[15px] font-extrabold" style={{ color: isToday ? '#fff' : 'var(--smc-text)' }}>{day.getDate()}</div>
                      </div>
                      {/* Sessions */}
                      <div className="p-2 space-y-1.5 min-h-[120px]">
                        {daySessions.length === 0 ? (
                          <div className="text-center pt-4 text-[10px]" style={{ color: 'var(--smc-text-4)' }}>Trống</div>
                        ) : daySessions.map(s => {
                          const t = new Date(s.scheduled_at);
                          const isLive = s.status === 'live';
                          const isEnded = s.status === 'ended';
                          return (
                            <button key={s.id} onClick={() => { setSelectedSession(s); setScriptPreview(s.script ?? ''); }}
                              className="w-full text-left rounded-[8px] p-2 transition-all hover:opacity-90"
                              style={{ background: isLive ? color : isEnded ? 'var(--smc-border)' : colorLight, border: `1px solid ${isLive ? color : colorBorder}` }}>
                              {isLive && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Radio size={9} className="animate-pulse" style={{ color: '#fff' }}/>
                                  <span className="text-[9px] font-bold text-white">LIVE</span>
                                </div>
                              )}
                              <div className="text-[10px] font-bold truncate" style={{ color: isLive ? '#fff' : isEnded ? 'var(--smc-text-4)' : colorDark }}>{s.title}</div>
                              <div className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: isLive ? 'rgba(255,255,255,0.8)' : 'var(--smc-text-4)' }}>
                                <Clock3 size={8}/>{t.getHours()}:{String(t.getMinutes()).padStart(2,'0')} · {s.duration_minutes}p
                              </div>
                              {isEnded && s.viewer_count > 0 && (
                                <div className="text-[9px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>
                                  {s.viewer_count.toLocaleString('vi-VN')} xem · {s.orders_count} đơn
                                </div>
                              )}
                            </button>
                          );
                        })}
                        <button onClick={() => { setLiveForm({ shopId: shops[0]?.id ?? '', title: '', scheduledAt: `${day.toISOString().slice(0,10)}T20:00`, durationMinutes: '60' }); setLiveFormOpen(true); }}
                          className="w-full text-center py-1 rounded-[6px] text-[10px] border border-dashed opacity-50 hover:opacity-100 transition-opacity"
                          style={{ borderColor: colorBorder, color }}>
                          + Thêm
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })()}

      {/* ════════════════ LIVE SESSION DETAIL MODAL ════════════════ */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-[20px] p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-y-auto" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {selectedSession.status === 'live' && <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: '#ef4444' }}><Radio size={9} className="animate-pulse"/> LIVE</span>}
                  {selectedSession.status === 'ended' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--smc-border)', color: 'var(--smc-text-4)' }}>Đã kết thúc</span>}
                  {selectedSession.status === 'scheduled' && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: 'var(--smc-surface-3)', color }}><Play size={9} className="inline mr-1"/>Sắp diễn ra</span>}
                </div>
                <h3 className="text-[17px] font-extrabold" style={{ color: 'var(--smc-text)' }}>{selectedSession.title}</h3>
                <div className="text-[12px] mt-1 flex items-center gap-3" style={{ color: 'var(--smc-text-3)' }}>
                  <span><Calendar size={11} className="inline mr-1"/>{new Date(selectedSession.scheduled_at).toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}</span>
                  <span><Clock3 size={11} className="inline mr-1"/>{new Date(selectedSession.scheduled_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {selectedSession.duration_minutes} phút</span>
                  <span><Store size={11} className="inline mr-1"/>{selectedSession.shop_name}</span>
                </div>
              </div>
              <button onClick={() => setSelectedSession(null)} style={{ color: 'var(--smc-text-4)' }}><X size={18}/></button>
            </div>

            {/* Stats (if ended) */}
            {selectedSession.status === 'ended' && (
              <div className="grid grid-cols-3 gap-3 mb-5">
                {[
                  { label: 'Lượt xem', value: selectedSession.viewer_count.toLocaleString('vi-VN'), icon: <Users size={15}/> },
                  { label: 'Đơn hàng', value: selectedSession.orders_count, icon: <ShoppingCart size={15}/> },
                  { label: 'GMV', value: fmtMoney(selectedSession.gmv), icon: <TrendingUp size={15}/> },
                ].map((k, i) => (
                  <div key={i} className="rounded-[12px] p-3 text-center" style={{ background: colorLight }}>
                    <div className="flex justify-center mb-1" style={{ color }}>{k.icon}</div>
                    <div className="text-[16px] font-extrabold" style={{ color }}>{k.value}</div>
                    <div className="text-[11px]" style={{ color: colorDark }}>{k.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* AI Script section */}
            <div className="rounded-[14px] p-4 mb-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
              <div className="flex items-center justify-between mb-3">
                <div className="text-[13px] font-bold flex items-center gap-2" style={{ color: 'var(--smc-text)' }}>
                  <Wand2 size={14} style={{ color }}/> Script LIVE
                </div>
                <button onClick={() => generateLiveScript(selectedSession)} disabled={generatingScript}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white disabled:opacity-60"
                  style={{ background: color }}>
                  {generatingScript ? <><RefreshCw size={12} className="animate-spin"/> Đang tạo...</> : <><Sparkles size={12}/> AI tạo script</>}
                </button>
              </div>
              {(scriptPreview || selectedSession.script) ? (
                <div className="text-[12px] leading-relaxed whitespace-pre-wrap rounded-[8px] p-3 max-h-[200px] overflow-y-auto"
                  style={{ background: 'var(--smc-surface-2)', color: 'var(--smc-text-3)', border: '1px solid var(--smc-border)' }}>
                  {scriptPreview || selectedSession.script}
                </div>
              ) : (
                <div className="text-[12px] text-center py-4" style={{ color: 'var(--smc-text-4)' }}>
                  Chưa có script. Nhấn &quot;AI tạo script&quot; để AI viết script LIVE cho phiên này.
                </div>
              )}
              {scriptPreview && (
                <button onClick={() => { navigator.clipboard.writeText(scriptPreview); }}
                  className="flex items-center gap-1 mt-2 text-[11px] font-semibold"
                  style={{ color }}>
                  <Copy size={11}/> Copy script
                </button>
              )}
            </div>

            {/* Actions */}
            {selectedSession.status === 'scheduled' && (
              <div className="flex gap-2">
                <button onClick={() => deleteLiveSession(selectedSession.id)}
                  className="px-4 py-2 rounded-[10px] text-[13px] font-semibold border"
                  style={{ color: '#dc2626', borderColor: '#fecaca', background: '#fef2f2' }}>
                  Xóa phiên
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════ LIVE FORM MODAL ════════════════ */}
      {liveFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-[20px] p-6 w-full max-w-md shadow-2xl" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--smc-text)' }}>Lên lịch phiên LIVE</h3>
              <button onClick={() => setLiveFormOpen(false)} style={{ color: 'var(--smc-text-4)' }}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Shop *</label>
                <select value={liveForm.shopId} onChange={e => setLiveForm(f => ({ ...f, shopId: Number(e.target.value) }))}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="">Chọn shop</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Tên phiên LIVE *</label>
                <input value={liveForm.title} onChange={e => setLiveForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="VD: Flash Sale Cuối Tuần"
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Thời gian bắt đầu *</label>
                <input type="datetime-local" value={liveForm.scheduledAt} onChange={e => setLiveForm(f => ({ ...f, scheduledAt: e.target.value }))}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Thời lượng (phút)</label>
                <select value={liveForm.durationMinutes} onChange={e => setLiveForm(f => ({ ...f, durationMinutes: e.target.value }))}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  {[30, 60, 90, 120, 180].map(m => <option key={m} value={m}>{m} phút</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setLiveFormOpen(false)}
                className="flex-1 py-2.5 rounded-[12px] text-[13px] font-semibold border"
                style={{ color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}>Hủy</button>
              <button onClick={createLiveSession} disabled={liveFormSaving || !liveForm.title || !liveForm.scheduledAt}
                className="flex-1 py-2.5 rounded-[12px] text-white text-[13px] font-semibold disabled:opacity-60"
                style={{ background: color }}>
                {liveFormSaving ? 'Đang lưu...' : 'Tạo phiên LIVE'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ TAB: AI HUB — AI REVIEW ════════════════ */}
      {tab === 'ai' && (() => {
        // Score each product
        const scored = products.map(p => {
          let score = 0;
          const checks = [
            { label: 'Tên SP đủ dài (40-80 ký tự)', ok: p.name.length >= 40 && p.name.length <= 80, points: 25 },
            { label: 'Có danh mục', ok: !!p.category && p.category.trim().length > 0, points: 15 },
            { label: 'Có giá khuyến mãi', ok: Number(p.sale_price) > 0, points: 15 },
            { label: 'Đã đăng lên sàn', ok: Number(p.listing_count) > 0, points: 20 },
            { label: 'Còn hàng', ok: p.stock > 0, points: 15 },
            { label: 'Có lượt bán', ok: Number(p.total_sales) > 0, points: 10 },
          ];
          score = checks.reduce((s, c) => s + (c.ok ? c.points : 0), 0);
          const issues = checks.filter(c => !c.ok).map(c => c.label);
          return { ...p, score, issues };
        });
        const needsWork = scored.filter(p => p.score < 70).sort((a, b) => a.score - b.score);
        const good = scored.filter(p => p.score >= 70).sort((a, b) => b.score - a.score);
        const avgScore = scored.length > 0 ? Math.round(scored.reduce((s, p) => s + p.score, 0) / scored.length) : 0;

        return (
          <div className="space-y-5">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-[16px] font-extrabold flex items-center gap-2" style={{ color: 'var(--smc-text)' }}>
                  <Sparkles size={18} style={{ color }}/> AI Đánh giá sản phẩm
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--smc-text-3)' }}>
                  Scan {products.length} SP · tìm vấn đề · gợi ý tối ưu cụ thể cho từng sản phẩm
                </p>
              </div>
              <button onClick={() => { setTab('products'); }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-[13px] font-semibold border"
                style={{ color, borderColor: colorBorder, background: colorLight }}>
                <Edit3 size={13}/> Chỉnh sửa SP
              </button>
            </div>

            {/* Overall health */}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { label: 'Điểm trung bình', value: `${avgScore}/100`, color: avgScore >= 70 ? '#16a34a' : avgScore >= 50 ? '#d97706' : '#dc2626', icon: <BarChart3 size={16}/> },
                { label: 'SP cần tối ưu', value: needsWork.length, color: needsWork.length > 0 ? '#dc2626' : '#16a34a', icon: <AlertTriangle size={16}/> },
                { label: 'SP ổn', value: good.length, color: '#16a34a', icon: <CheckCircle size={16}/> },
                { label: 'Chưa đăng lên sàn', value: products.filter(p => Number(p.listing_count) === 0).length, color: '#d97706', icon: <AlertCircle size={16}/> },
              ].map((k, i) => (
                <div key={i} className="rounded-[14px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <div className="flex items-center gap-1.5 mb-2"><span style={{ color: k.color }}>{k.icon}</span><span className="text-[11px]" style={{ color: 'var(--smc-text-3)' }}>{k.label}</span></div>
                  <div className="text-[22px] font-extrabold" style={{ color: k.color }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Products needing work */}
            {needsWork.length > 0 && (
              <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--smc-border)', background: '#fef2f2' }}>
                  <AlertTriangle size={14} style={{ color: '#dc2626' }}/>
                  <span className="text-[13px] font-bold" style={{ color: '#dc2626' }}>{needsWork.length} sản phẩm cần tối ưu gấp</span>
                </div>
                {needsWork.map(p => {
                  const scoreColor = p.score < 40 ? '#dc2626' : '#d97706';
                  return (
                    <div key={p.id} className="px-5 py-4 flex items-start gap-4" style={{ borderBottom: '1px solid var(--smc-border)' }}>
                      {/* Score circle */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-[14px] text-white"
                        style={{ background: scoreColor }}>
                        {p.score}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[13px] font-bold truncate" style={{ color: 'var(--smc-text)' }}>{p.name}</span>
                          <span className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{p.sku}</span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {p.issues.map((issue, i) => (
                            <span key={i} className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#fef2f2', color: '#dc2626' }}>
                              ✗ {issue}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => { openEditProduct(p); }}
                        className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold text-white"
                        style={{ background: color }}>
                        <Wand2 size={12}/> Tối ưu ngay
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Good products */}
            {good.length > 0 && (
              <div className="rounded-[16px] overflow-hidden" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <div className="px-5 py-3 flex items-center gap-2" style={{ borderBottom: '1px solid var(--smc-border)', background: '#f0fdf4' }}>
                  <CheckCircle size={14} style={{ color: '#16a34a' }}/>
                  <span className="text-[13px] font-bold" style={{ color: '#16a34a' }}>{good.length} sản phẩm ổn định</span>
                </div>
                {good.slice(0, 5).map(p => (
                  <div key={p.id} className="px-5 py-3 flex items-center gap-3" style={{ borderBottom: '1px solid var(--smc-border)' }}>
                    <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-extrabold text-[13px] text-white"
                      style={{ background: '#16a34a' }}>
                      {p.score}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-semibold truncate" style={{ color: 'var(--smc-text)' }}>{p.name}</div>
                      <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{p.sku} · {p.listing_count} listing · {p.total_sales} đã bán</div>
                    </div>
                    <button onClick={() => openEditProduct(p)}
                      className="flex-shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-[8px] text-[11.5px] font-semibold border"
                      style={{ color, borderColor: colorBorder, background: colorLight }}>
                      <Edit3 size={11}/> Sửa
                    </button>
                  </div>
                ))}
                {good.length > 5 && (
                  <div className="px-5 py-2 text-center text-[12px]" style={{ color: 'var(--smc-text-4)' }}>
                    +{good.length - 5} sản phẩm khác ổn định · <button onClick={() => setTab('products')} className="underline" style={{ color }}>Xem tất cả</button>
                  </div>
                )}
              </div>
            )}

            {/* Platform features hint */}
            <div className="rounded-[14px] p-4" style={{ background: colorLight, border: `1px solid ${colorBorder}` }}>
              <div className="text-[11px] font-bold mb-2 uppercase tracking-wide" style={{ color: colorDark }}>Tính năng đặc thù {label}</div>
              <div className="flex flex-wrap gap-2">
                {platformFeatures.map((f, i) => <span key={i} className="text-[12px] px-2.5 py-1 rounded-[8px] font-medium" style={{ background: 'var(--smc-surface)', color: colorDark }}>{f}</span>)}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════ TAB: ANALYTICS ════════════════ */}
      {tab === 'analytics' && (() => {
        // Build 7-day mock trend from shop data (proportional simulation)
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date(); d.setDate(d.getDate() - (6 - i));
          return d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
        });
        const base = totalRevenue / 7 || 100000;
        const trendData = days.map((label, i) => {
          const noise = 0.6 + Math.sin(i * 1.3 + 1) * 0.4;
          return { label, value: Math.round(base * noise) };
        });
        const maxTrend = Math.max(...trendData.map(d => d.value), 1);

        // Top products by listing sales
        const topListings = [...listings].sort((a, b) => b.sales - a.sales).slice(0, 5);
        const maxSales = Math.max(...topListings.map(l => l.sales), 1);

        // Conversion stats
        const totalViews = listings.reduce((s, l) => s + (l.views ?? 0), 0);
        const totalSalesCount = listings.reduce((s, l) => s + (l.sales ?? 0), 0);
        const cvr = totalViews > 0 ? ((totalSalesCount / totalViews) * 100).toFixed(2) : '0';
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        return (
          <div className="space-y-4">
            {/* KPI row */}
            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
              {[
                { label: 'Tổng doanh thu', value: fmtMoney(totalRevenue), icon: <TrendingUp size={16}/>, sub: 'tất cả shop', trend: '+12%' },
                { label: 'Tổng đơn hàng', value: totalOrders.toLocaleString('vi-VN'), icon: <ShoppingCart size={16}/>, sub: 'tổng cộng', trend: '+8%' },
                { label: 'Giá trị TB/đơn', value: fmtMoney(avgOrderValue), icon: <DollarSign size={16}/>, sub: 'average order', trend: '+3%' },
                { label: 'Tỷ lệ chuyển đổi', value: `${cvr}%`, icon: <BarChart3 size={16}/>, sub: `${totalViews.toLocaleString('vi-VN')} lượt xem`, trend: '' },
              ].map((kpi, i) => (
                <div key={i} className="rounded-[16px] p-4" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span style={{ color }}>{kpi.icon}</span>
                    <span className="text-[11px]" style={{ color: 'var(--smc-text-3)' }}>{kpi.label}</span>
                  </div>
                  <div className="text-[20px] font-extrabold" style={{ color: 'var(--smc-text)' }}>{kpi.value}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{kpi.sub}</span>
                    {kpi.trend && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: '#f0fdf4', color: '#16a34a' }}>{kpi.trend}</span>}
                  </div>
                </div>
              ))}
            </div>

            {/* Revenue trend chart */}
            <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
              <div className="flex items-center justify-between mb-4">
                <div className="text-[14px] font-bold" style={{ color: 'var(--smc-text)' }}>Xu hướng doanh thu 7 ngày</div>
                <span className="text-[11px] px-2 py-1 rounded-full font-semibold" style={{ background: colorLight, color }}>{label}</span>
              </div>
              <div className="flex items-end gap-2" style={{ height: 120 }}>
                {trendData.map((d, i) => {
                  const h = Math.max(4, (d.value / maxTrend) * 100);
                  const isLast = i === trendData.length - 1;
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="text-[9px] font-semibold" style={{ color: isLast ? color : 'var(--smc-text-4)' }}>
                        {fmtMoney(d.value).replace('₫', '')}
                      </div>
                      <div className="w-full rounded-t-[6px] transition-all"
                        style={{ height: `${h}px`, background: isLast ? color : colorBorder, opacity: isLast ? 1 : 0.7 }}/>
                      <div className="text-[9px] text-center leading-tight" style={{ color: 'var(--smc-text-4)' }}>{d.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Bottom 2 col */}
            <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
              {/* Top products bar chart */}
              <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--smc-text)' }}>Top SP bán chạy</div>
                {topListings.length === 0 ? (
                  <div className="text-[13px] text-center py-6" style={{ color: 'var(--smc-text-4)' }}>Chưa có dữ liệu</div>
                ) : topListings.map((l, i) => {
                  const p = products.find(pr => pr.id === l.product_id);
                  const w = Math.max(4, (l.sales / maxSales) * 100);
                  return (
                    <div key={l.id} className="mb-3">
                      <div className="flex justify-between mb-1">
                        <span className="text-[12px] font-medium truncate max-w-[140px]" style={{ color: 'var(--smc-text)' }}>
                          {i + 1}. {p?.name ?? `SP #${l.product_id}`}
                        </span>
                        <span className="text-[11px] font-bold" style={{ color }}>{l.sales} đơn</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                        <div className="h-full rounded-full" style={{ width: `${w}%`, background: color }}/>
                      </div>
                      <div className="text-[10px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>
                        {l.views ?? 0} views · CVR {l.views ? ((l.sales / l.views) * 100).toFixed(1) : 0}%
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Shop breakdown */}
              <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--smc-text)' }}>Doanh thu theo shop</div>
                {shops.length === 0 ? (
                  <div className="text-center py-6 text-[13px]" style={{ color: 'var(--smc-text-4)' }}>Chưa có shop nào</div>
                ) : shops.map(shop => {
                  const pct = totalRevenue > 0 ? (shop.revenue / totalRevenue) * 100 : 0;
                  return (
                    <div key={shop.id} className="mb-4">
                      <div className="flex justify-between mb-1">
                        <span className="text-[12.5px] font-medium truncate max-w-[160px]" style={{ color: 'var(--smc-text)' }}>{shop.name}</span>
                        <span className="text-[12.5px] font-semibold" style={{ color }}>{fmtMoney(shop.revenue)}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }}/>
                      </div>
                      <div className="text-[11px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>
                        {shop.orders} đơn · {pct.toFixed(1)}% · {shop.listing_count} SP
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ════════════════ TAB: SETTINGS ════════════════ */}
      {tab === 'settings' && (
        <div className="space-y-4 max-w-[560px]">
          <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--smc-text)' }}>Cấu hình phí sàn</div>
            <div className="space-y-3">
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Phí sàn {label} (%)</label>
                <input type="number" value={fee} onChange={e => setFee(Number(e.target.value))} min={0} max={50} step={0.5}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Thuế VAT (%)</label>
                <input type="number" value={vat} onChange={e => setVat(Number(e.target.value))} min={0} max={30}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
              </div>
              <div className="rounded-[10px] p-3" style={{ background: colorLight }}>
                <div className="text-[12px]" style={{ color: colorDark }}>
                  SP giá 300.000đ → sau phí sàn {fee}% + VAT {vat}% = thực nhận{' '}
                  <strong>{Math.round(300000 * (1 - fee / 100) * (1 - vat / 100)).toLocaleString('vi-VN')}đ</strong>
                </div>
              </div>
            </div>
          </div>
          <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[14px] font-bold mb-4" style={{ color: 'var(--smc-text)' }}>OAuth Token theo shop</div>
            {shops.length === 0 ? <div className="text-[13px]" style={{ color: 'var(--smc-text-4)' }}>Chưa có shop nào.</div> : shops.map(shop => {
              const ts = tokenState(shop.token_expires_at);
              const daysLeft = shop.token_expires_at ? Math.max(0, Math.round((new Date(shop.token_expires_at).getTime() - Date.now()) / 86400000)) : null;
              return (
                <div key={shop.id} className="flex items-center justify-between p-3 mb-2 rounded-[10px]"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                  <div>
                    <div className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{shop.name}</div>
                    <div className="text-[11.5px] mt-0.5 flex items-center gap-1.5">
                      <span style={{ color: TOKEN_COLOR[ts] }}>●</span>
                      <span style={{ color: 'var(--smc-text-3)' }}>
                        {ts === 'ok' ? `Token còn ${daysLeft} ngày` : ts === 'soon' ? `Sắp hết — còn ${daysLeft} ngày` : ts === 'expired' ? 'Đã hết hạn' : 'Chưa có token'}
                      </span>
                    </div>
                  </div>
                  <button onClick={() => refreshToken(shop.id)} disabled={refreshing === shop.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] text-[12px] font-semibold transition-all hover:opacity-80"
                    style={{ background: colorLight, color: colorDark, border: `1px solid ${colorBorder}` }}>
                    <RotateCcw size={12}/>{refreshing === shop.id ? 'Đang làm mới...' : 'Làm mới token'}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="rounded-[16px] p-5" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
            <div className="text-[14px] font-bold mb-3" style={{ color: 'var(--smc-text)' }}>Trạng thái kết nối API</div>
            <div className="flex items-center gap-3 p-3 rounded-[10px]"
              style={{ background: configStatus?.configured ? '#f0fdf4' : '#fffbeb', border: `1px solid ${configStatus?.configured ? '#bbf7d0' : '#fef08a'}` }}>
              {configStatus?.configured ? <CheckCircle size={16} className="text-green-600 flex-shrink-0"/> : <AlertTriangle size={16} className="text-amber-600 flex-shrink-0"/>}
              <div>
                <div className="text-[12.5px] font-semibold" style={{ color: configStatus?.configured ? '#15803d' : '#92400e' }}>
                  {configStatus?.configured ? `${label} API đã cấu hình` : `Chưa cấu hình ${label} API`}
                </div>
                <div className="text-[11.5px] mt-0.5" style={{ color: configStatus?.configured ? '#16a34a' : '#d97706' }}>
                  {configStatus?.configured ? 'App credentials đã được load từ .env.local' : 'Thêm API key vào .env.local để kết nối thực'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ PRODUCT EDIT/CREATE DRAWER ════════════════ */}
      {prodDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={() => setProdDrawerOpen(false)}>
          <div className="h-full w-full max-w-2xl flex flex-col shadow-2xl overflow-hidden"
            style={{ background: 'var(--smc-surface)', borderLeft: `3px solid ${color}` }}
            onClick={e => e.stopPropagation()}>

            {/* Drawer header */}
            <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--smc-border)', background: 'var(--smc-surface-2)' }}>
              <div>
                <h2 className="text-[16px] font-extrabold" style={{ color: 'var(--smc-text)' }}>
                  {prodDrawerMode === 'create' ? 'Thêm sản phẩm mới' : `Chỉnh sửa: ${prodForm.name || '—'}`}
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>
                  {prodDrawerMode === 'create' ? 'Tạo SP mới và dùng AI để tối ưu nội dung ngay' : 'Chỉnh sửa thông tin · AI hỗ trợ tối ưu'}
                </p>
              </div>
              <button onClick={() => setProdDrawerOpen(false)} style={{ color: 'var(--smc-text-4)' }}><X size={20}/></button>
            </div>

            {/* Drawer body — 2 columns */}
            <div className="flex-1 overflow-y-auto">
              <div className="grid grid-cols-2 gap-0 h-full">

                {/* LEFT: Form fields */}
                <div className="p-6 space-y-4 overflow-y-auto" style={{ borderRight: '1px solid var(--smc-border)' }}>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--smc-text-4)' }}>Thông tin sản phẩm</div>

                  {/* Name with AI button */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[12px] font-semibold" style={{ color: 'var(--smc-text-3)' }}>Tên sản phẩm *</label>
                      <button onClick={() => aiGenerateForProduct('name')} disabled={aiField === 'name'}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full disabled:opacity-60"
                        style={{ background: 'var(--smc-surface-3)', color }}>
                        {aiField === 'name' ? <><RefreshCw size={9} className="animate-spin"/> Đang tạo...</> : <><Sparkles size={9}/> AI tạo tiêu đề</>}
                      </button>
                    </div>
                    <input value={prodForm.name} onChange={e => setProdForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="VD: Áo thun nam cao cấp cotton 100% thoáng mát..."
                      className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: `1px solid ${prodForm.name.length > 40 && prodForm.name.length <= 80 ? '#16a34a' : 'var(--smc-border)'}`, color: 'var(--smc-text)' }}/>
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px]" style={{ color: prodForm.name.length >= 40 && prodForm.name.length <= 80 ? '#16a34a' : 'var(--smc-text-4)' }}>
                        {prodForm.name.length}/80 ký tự {prodForm.name.length >= 40 && prodForm.name.length <= 80 ? '✓ Tối ưu' : prodForm.name.length < 40 ? '(nên từ 40+)' : '(quá dài)'}
                      </span>
                    </div>
                  </div>

                  {/* SKU + Category row */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>SKU *</label>
                      <input value={prodForm.sku} onChange={e => setProdForm(f => ({ ...f, sku: e.target.value }))}
                        disabled={prodDrawerMode === 'edit'}
                        className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none disabled:opacity-60"
                        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Danh mục</label>
                      <input value={prodForm.category} onChange={e => setProdForm(f => ({ ...f, category: e.target.value }))}
                        placeholder="VD: Thời trang nam"
                        className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                    </div>
                  </div>

                  {/* Price row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Giá gốc *', key: 'price', placeholder: '150000' },
                      { label: 'Giá vốn', key: 'cost_price', placeholder: '80000' },
                      { label: 'Giá KM', key: 'sale_price', placeholder: '120000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>{f.label}</label>
                        <input type="number" value={prodForm[f.key as 'price' | 'cost_price' | 'sale_price']}
                          onChange={e => setProdForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                          placeholder={f.placeholder}
                          className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                          style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                      </div>
                    ))}
                  </div>

                  {/* Profit calc */}
                  {prodForm.price && prodForm.cost_price && (
                    <div className="rounded-[8px] px-3 py-2 text-[11.5px]" style={{ background: 'var(--smc-surface-3)', border: '1px solid var(--smc-border)' }}>
                      <span style={{ color: 'var(--smc-text-2)' }}>
                        Lợi nhuận: {fmtMoney((Number(prodForm.sale_price || prodForm.price) - Number(prodForm.cost_price)))} ·{' '}
                        Margin: {(((Number(prodForm.sale_price || prodForm.price) - Number(prodForm.cost_price)) / Number(prodForm.sale_price || prodForm.price)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  )}

                  {/* Stock + Weight */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Tồn kho</label>
                      <input type="number" value={prodForm.stock} onChange={e => setProdForm(f => ({ ...f, stock: e.target.value }))}
                        className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                    </div>
                    <div>
                      <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Trọng lượng (g)</label>
                      <input type="number" value={prodForm.weight} onChange={e => setProdForm(f => ({ ...f, weight: e.target.value }))}
                        className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                    </div>
                  </div>

                  {/* Description with AI */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[12px] font-semibold" style={{ color: 'var(--smc-text-3)' }}>Mô tả sản phẩm</label>
                      <button onClick={() => aiGenerateForProduct('description')} disabled={aiField === 'description'}
                        className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full disabled:opacity-60"
                        style={{ background: 'var(--smc-surface-3)', color }}>
                        {aiField === 'description' ? <><RefreshCw size={9} className="animate-spin"/> Đang tạo...</> : <><Sparkles size={9}/> AI viết mô tả</>}
                      </button>
                    </div>
                    <textarea value={prodForm.description} onChange={e => setProdForm(f => ({ ...f, description: e.target.value }))}
                      placeholder="Mô tả chi tiết sản phẩm, chất liệu, kích thước, hướng dẫn sử dụng..."
                      rows={5}
                      className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none resize-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                    <span className="text-[10px]" style={{ color: prodForm.description.length > 100 ? '#16a34a' : 'var(--smc-text-4)' }}>
                      {prodForm.description.length} ký tự {prodForm.description.length > 100 ? '✓' : '(nên trên 100)'}
                    </span>
                  </div>

                  {/* Status */}
                  <div>
                    <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Trạng thái</label>
                    <select value={prodForm.status} onChange={e => setProdForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                      <option value="active">Đang bán</option>
                      <option value="inactive">Tạm dừng</option>
                      <option value="draft">Nháp</option>
                    </select>
                  </div>

                  {prodSaveErr && <p className="text-[12px] font-semibold" style={{ color: '#ef4444' }}>{prodSaveErr}</p>}
                </div>

                {/* RIGHT: AI Panel */}
                <div className="p-6 flex flex-col gap-4 overflow-y-auto" style={{ background: 'var(--smc-surface-2)' }}>
                  <div className="text-[11px] font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5" style={{ color }}>
                    <Sparkles size={12}/> AI Tối ưu nội dung
                  </div>

                  {/* AI action buttons */}
                  <div className="space-y-2">
                    {[
                      { id: 'name' as const, icon: <Tag size={13}/>, label: 'Tạo tiêu đề tối ưu', desc: '3 phương án tiêu đề chuẩn SEO' },
                      { id: 'description' as const, icon: <MessageSquare size={13}/>, label: 'Viết mô tả hấp dẫn', desc: 'Mô tả đầy đủ, có CTA và emoji' },
                      { id: 'seo' as const, icon: <TrendingUp size={13}/>, label: 'Phân tích & gợi ý SEO', desc: 'Từ khóa, điểm yếu, cải thiện' },
                    ].map(action => (
                      <button key={action.id} onClick={() => aiGenerateForProduct(action.id)} disabled={!!aiField}
                        className="w-full text-left px-4 py-3 rounded-[12px] border transition-all hover:opacity-90 disabled:opacity-50"
                        style={{ background: 'var(--smc-surface-2)', border: `1px solid ${colorBorder}` }}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span style={{ color }}>{action.icon}</span>
                          <span className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{action.label}</span>
                          {aiField === action.id && <RefreshCw size={11} className="animate-spin ml-auto" style={{ color }}/>}
                        </div>
                        <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{action.desc}</div>
                      </button>
                    ))}
                  </div>

                  {/* AI Result */}
                  {aiFieldResult && (
                    <div className="rounded-[12px] p-4 flex-1" style={{ background: 'var(--smc-surface-2)', border: `1px solid ${colorBorder}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold uppercase" style={{ color }}>
                          {aiFieldResult.field === 'name' ? 'Gợi ý tiêu đề' : aiFieldResult.field === 'description' ? 'Mô tả đã tạo' : 'Phân tích SEO'}
                        </span>
                        <button onClick={() => setAiFieldResult(null)} style={{ color: 'var(--smc-text-4)' }}><X size={14}/></button>
                      </div>
                      <div className="text-[12px] leading-relaxed whitespace-pre-wrap max-h-[250px] overflow-y-auto" style={{ color: 'var(--smc-text-3)' }}>
                        {aiFieldResult.text}
                      </div>
                      {(aiFieldResult.field === 'name' || aiFieldResult.field === 'description') && (
                        <button onClick={() => applyAiToField(aiFieldResult.field, aiFieldResult.text)}
                          className="mt-3 w-full py-2 rounded-[8px] text-white text-[12px] font-bold"
                          style={{ background: color }}>
                          ✓ Áp dụng vào form
                        </button>
                      )}
                      <button onClick={() => { navigator.clipboard.writeText(aiFieldResult.text); }}
                        className="mt-2 w-full py-1.5 rounded-[8px] text-[11px] font-semibold border"
                        style={{ color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}>
                        <Copy size={11} className="inline mr-1"/> Copy nội dung
                      </button>
                    </div>
                  )}

                  {/* SEO Score Preview */}
                  {!aiFieldResult && (
                    <div className="rounded-[12px] p-4" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
                      <div className="text-[11px] font-bold mb-3 uppercase" style={{ color: 'var(--smc-text-4)' }}>Điểm SEO hiện tại</div>
                      {(() => {
                        let score = 0;
                        const checks = [
                          { label: 'Tên SP (40-80 ký tự)', ok: prodForm.name.length >= 40 && prodForm.name.length <= 80 },
                          { label: 'Có mô tả sản phẩm', ok: prodForm.description.length > 0 },
                          { label: 'Mô tả đủ dài (>100 ký tự)', ok: prodForm.description.length > 100 },
                          { label: 'Có giá khuyến mãi', ok: Number(prodForm.sale_price) > 0 },
                          { label: 'Có danh mục', ok: prodForm.category.length > 0 },
                        ];
                        score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
                        const scoreColor = score >= 80 ? '#16a34a' : score >= 50 ? '#d97706' : '#dc2626';
                        return (
                          <>
                            <div className="flex items-end gap-2 mb-3">
                              <span className="text-[36px] font-extrabold leading-none" style={{ color: scoreColor }}>{score}</span>
                              <span className="text-[14px] mb-1" style={{ color: 'var(--smc-text-4)' }}>/100</span>
                            </div>
                            <div className="h-2 rounded-full overflow-hidden mb-3" style={{ background: 'var(--smc-border)' }}>
                              <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: scoreColor }}/>
                            </div>
                            <div className="space-y-1.5">
                              {checks.map((c, i) => (
                                <div key={i} className="flex items-center gap-2 text-[11px]">
                                  <span style={{ color: c.ok ? '#16a34a' : '#dc2626' }}>{c.ok ? '✓' : '✗'}</span>
                                  <span style={{ color: c.ok ? 'var(--smc-text-3)' : 'var(--smc-text-4)' }}>{c.label}</span>
                                </div>
                              ))}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Drawer footer */}
            <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid var(--smc-border)', background: 'var(--smc-surface-2)' }}>
              <button onClick={() => setProdDrawerOpen(false)}
                className="px-5 py-2.5 rounded-[12px] text-[13px] font-semibold border"
                style={{ color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}>
                Hủy
              </button>
              <button onClick={saveProduct} disabled={prodSaving || !prodForm.name || !prodForm.price}
                className="flex-1 py-2.5 rounded-[12px] text-white text-[13px] font-bold disabled:opacity-60"
                style={{ background: color }}>
                {prodSaving ? 'Đang lưu...' : prodDrawerMode === 'create' ? 'Tạo sản phẩm' : 'Lưu thay đổi'}
              </button>
              {prodDrawerMode === 'create' && (
                <button onClick={async () => { await saveProduct(); if (!prodSaveErr) { /* open publish */ } }}
                  disabled={prodSaving || !prodForm.name || !prodForm.price}
                  className="px-4 py-2.5 rounded-[12px] text-[13px] font-bold border disabled:opacity-60"
                  style={{ color, borderColor: colorBorder, background: 'transparent' }}>
                  Lưu & Đăng ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ AFFILIATE ENROLL MODAL ════════════════ */}
      {enrollOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="rounded-[20px] p-6 w-full max-w-md shadow-2xl" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[16px] font-bold" style={{ color: 'var(--smc-text)' }}>Đăng ký SP vào Affiliate</h3>
              <button onClick={() => setEnrollOpen(false)} style={{ color: 'var(--smc-text-4)' }}><X size={18}/></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Shop *</label>
                <select value={enrollShopId} onChange={e => setEnrollShopId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="">Chọn shop</option>
                  {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Sản phẩm *</label>
                <select value={enrollProductId} onChange={e => setEnrollProductId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="">Chọn sản phẩm</option>
                  {products.map(p => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1 block" style={{ color: 'var(--smc-text-3)' }}>Hoa hồng cho creator (%)</label>
                <div className="flex items-center gap-3">
                  <input type="range" min={0} max={80} step={0.5} value={enrollRate}
                    onChange={e => setEnrollRate(e.target.value)}
                    className="flex-1" style={{ accentColor: color }}/>
                  <div className="w-16 px-2 py-1.5 rounded-[8px] text-[13px] font-bold text-center"
                    style={{ background: 'var(--smc-surface-3)', color }}>{enrollRate}%</div>
                </div>
                <div className="text-[11px] mt-1" style={{ color: 'var(--smc-text-4)' }}>
                  {enrollProductId && products.find(p => p.id === Number(enrollProductId)) && (
                    <>Hoa hồng ≈ {fmtMoney((products.find(p => p.id === Number(enrollProductId))!.sale_price || products.find(p => p.id === Number(enrollProductId))!.price) * Number(enrollRate) / 100)} / đơn</>
                  )}
                </div>
              </div>
              {enrollError && <p className="text-[12px] font-semibold" style={{ color: '#ef4444' }}>{enrollError}</p>}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setEnrollOpen(false)}
                className="flex-1 py-2.5 rounded-[12px] text-[13px] font-semibold border"
                style={{ color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)', background: 'var(--smc-surface)' }}>
                Hủy
              </button>
              <button onClick={enrollAffiliate} disabled={enrollSaving}
                className="flex-1 py-2.5 rounded-[12px] text-white text-[13px] font-semibold disabled:opacity-60"
                style={{ background: color }}>
                {enrollSaving ? 'Đang lưu...' : 'Đăng ký'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════ DEAL FORM MODAL ════════════════ */}
      {dealFormOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setDealFormOpen(false)}/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[500px] rounded-[22px] shadow-2xl overflow-hidden" style={{ background: 'var(--smc-surface)' }}>
              <div className="flex items-center justify-between px-6 py-5" style={{ background: colorLight, borderBottom: `1px solid ${colorBorder}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: color }}><Flame size={16} color="#fff"/></div>
                  <div>
                    <div className="text-[15px] font-extrabold" style={{ color: colorDark }}>Tạo Flash Deal</div>
                    <div className="text-[12px]" style={{ color }}>Trên {label}</div>
                  </div>
                </div>
                <button onClick={() => setDealFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70" style={{ background: colorBorder }}>
                  <X size={14} style={{ color: colorDark }}/>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {dealError && (
                  <div className="text-[12.5px] p-3 rounded-[10px]" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{dealError}</div>
                )}
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="col-span-2">
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Tên Flash Deal *</label>
                    <input value={dealForm.name} onChange={e => setDealForm(f => ({ ...f, name: e.target.value }))}
                      placeholder="VD: Sale cuối tuần -30%"
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Shop *</label>
                    <select value={dealForm.shopId} onChange={e => setDealForm(f => ({ ...f, shopId: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                      {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Loại giảm giá</label>
                    <select value={dealForm.discountType} onChange={e => setDealForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (đ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>
                      Mức giảm * {dealForm.discountType === 'percent' ? '(%)' : '(đ)'}
                    </label>
                    <input type="number" value={dealForm.discountValue} onChange={e => setDealForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder={dealForm.discountType === 'percent' ? '10' : '50000'}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Đơn hàng tối thiểu (đ)</label>
                    <input type="number" value={dealForm.minPurchase} onChange={e => setDealForm(f => ({ ...f, minPurchase: e.target.value }))}
                      placeholder="0 = không giới hạn"
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Bắt đầu *</label>
                    <input type="datetime-local" value={dealForm.startAt} onChange={e => setDealForm(f => ({ ...f, startAt: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Kết thúc *</label>
                    <input type="datetime-local" value={dealForm.endAt} onChange={e => setDealForm(f => ({ ...f, endAt: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                </div>
                {/* Preview */}
                {dealForm.discountValue && (
                  <div className="rounded-[12px] p-3" style={{ background: colorLight, border: `1px solid ${colorBorder}` }}>
                    <div className="text-[12px]" style={{ color: colorDark }}>
                      Sản phẩm giá <strong>300.000đ</strong> → sau Flash Deal{' '}
                      {dealForm.discountType === 'percent'
                        ? <strong>{(300000 * (1 - Number(dealForm.discountValue) / 100)).toLocaleString('vi-VN')}đ (-{dealForm.discountValue}%)</strong>
                        : <strong>{(300000 - Number(dealForm.discountValue)).toLocaleString('vi-VN')}đ</strong>
                      }
                    </div>
                  </div>
                )}
              </div>
              <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--smc-border)' }}>
                <button onClick={() => setDealFormOpen(false)}
                  className="py-2.5 px-4 rounded-[10px] text-[13px] font-semibold"
                  style={{ background: 'var(--smc-border)', color: 'var(--smc-text)' }}>Huỷ</button>
                <button onClick={saveDeal} disabled={dealSaving}
                  className="flex-1 py-2.5 rounded-[10px] text-white font-semibold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: color }}>
                  {dealSaving ? <RefreshCw size={14} className="animate-spin"/> : <Flame size={14}/>}
                  {dealSaving ? 'Đang tạo...' : 'Tạo Flash Deal'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ VOUCHER FORM MODAL ════════════════ */}
      {voucherFormOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => setVoucherFormOpen(false)}/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[500px] rounded-[22px] shadow-2xl overflow-hidden" style={{ background: 'var(--smc-surface)' }}>
              <div className="flex items-center justify-between px-6 py-5" style={{ background: colorLight, borderBottom: `1px solid ${colorBorder}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: color }}><Ticket size={16} color="#fff"/></div>
                  <div>
                    <div className="text-[15px] font-extrabold" style={{ color: colorDark }}>Tạo Voucher</div>
                    <div className="text-[12px]" style={{ color }}>Trên {label}</div>
                  </div>
                </div>
                <button onClick={() => setVoucherFormOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70" style={{ background: colorBorder }}>
                  <X size={14} style={{ color: colorDark }}/>
                </button>
              </div>
              <div className="p-6 space-y-4">
                {voucherError && (
                  <div className="text-[12.5px] p-3 rounded-[10px]" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>{voucherError}</div>
                )}
                <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Shop *</label>
                    <select value={voucherForm.shopId} onChange={e => setVoucherForm(f => ({ ...f, shopId: Number(e.target.value) }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                      {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Mã voucher * <span className="font-normal">(tự động HOA)</span></label>
                    <input value={voucherForm.code} onChange={e => setVoucherForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                      placeholder="VD: SALE30, FREESHIP"
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none font-mono"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Loại giảm giá</label>
                    <select value={voucherForm.discountType} onChange={e => setVoucherForm(f => ({ ...f, discountType: e.target.value as 'percent' | 'fixed' }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                      <option value="percent">Phần trăm (%)</option>
                      <option value="fixed">Số tiền cố định (đ)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>
                      Mức giảm * {voucherForm.discountType === 'percent' ? '(%)' : '(đ)'}
                    </label>
                    <input type="number" value={voucherForm.discountValue} onChange={e => setVoucherForm(f => ({ ...f, discountValue: e.target.value }))}
                      placeholder={voucherForm.discountType === 'percent' ? '30' : '50000'}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Đơn hàng tối thiểu (đ)</label>
                    <input type="number" value={voucherForm.minPurchase} onChange={e => setVoucherForm(f => ({ ...f, minPurchase: e.target.value }))}
                      placeholder="0 = không giới hạn"
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Giảm tối đa (đ) <span className="font-normal">cho loại %</span></label>
                    <input type="number" value={voucherForm.maxDiscount} onChange={e => setVoucherForm(f => ({ ...f, maxDiscount: e.target.value }))}
                      placeholder="0 = không giới hạn"
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}><Users size={11} className="inline mr-1"/>Giới hạn sử dụng</label>
                    <input type="number" value={voucherForm.usageLimit} onChange={e => setVoucherForm(f => ({ ...f, usageLimit: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div/>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Bắt đầu *</label>
                    <input type="datetime-local" value={voucherForm.startAt} onChange={e => setVoucherForm(f => ({ ...f, startAt: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                  <div>
                    <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-3)' }}>Kết thúc *</label>
                    <input type="datetime-local" value={voucherForm.endAt} onChange={e => setVoucherForm(f => ({ ...f, endAt: e.target.value }))}
                      className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                      style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                  </div>
                </div>
                {/* Preview */}
                {voucherForm.code && voucherForm.discountValue && (
                  <div className="rounded-[12px] p-3" style={{ background: colorLight, border: `1px solid ${colorBorder}` }}>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold px-2 py-1 rounded-[8px] text-[13px]"
                        style={{ background: color, color: '#fff' }}>{voucherForm.code}</span>
                      <span className="text-[13px] font-semibold" style={{ color: colorDark }}>
                        {voucherForm.discountType === 'percent'
                          ? `Giảm ${voucherForm.discountValue}%${voucherForm.maxDiscount ? ` (tối đa ${Number(voucherForm.maxDiscount).toLocaleString('vi-VN')}đ)` : ''}`
                          : `Giảm ${Number(voucherForm.discountValue).toLocaleString('vi-VN')}đ`}
                      </span>
                    </div>
                    {voucherForm.minPurchase && <div className="text-[11.5px] mt-1" style={{ color }}>Áp dụng cho đơn từ {Number(voucherForm.minPurchase).toLocaleString('vi-VN')}đ</div>}
                  </div>
                )}
              </div>
              <div className="px-6 py-4 flex gap-3" style={{ borderTop: '1px solid var(--smc-border)' }}>
                <button onClick={() => setVoucherFormOpen(false)}
                  className="py-2.5 px-4 rounded-[10px] text-[13px] font-semibold"
                  style={{ background: 'var(--smc-border)', color: 'var(--smc-text)' }}>Huỷ</button>
                <button onClick={saveVoucher} disabled={voucherSaving}
                  className="flex-1 py-2.5 rounded-[10px] text-white font-semibold text-[13px] flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ background: color }}>
                  {voucherSaving ? <RefreshCw size={14} className="animate-spin"/> : <Ticket size={14}/>}
                  {voucherSaving ? 'Đang tạo...' : 'Tạo Voucher'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ BULK PUBLISH MODAL ════════════════ */}
      {bulkOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40" onClick={() => { if (!bulkRunning) setBulkOpen(false); }}/>
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="w-full max-w-[680px] max-h-[90vh] flex flex-col rounded-[22px] shadow-2xl overflow-hidden"
              style={{ background: 'var(--smc-surface)' }}>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 flex-shrink-0"
                style={{ background: colorLight, borderBottom: `1px solid ${colorBorder}` }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{ background: color }}>{logo}</div>
                  <div>
                    <div className="text-[16px] font-extrabold" style={{ color: colorDark }}>
                      Bulk Publish — {label}
                    </div>
                    <div className="text-[12px]" style={{ color }}>
                      {selectedIds.size} sản phẩm được chọn
                    </div>
                  </div>
                </div>
                {!bulkRunning && (
                  <button onClick={() => setBulkOpen(false)}
                    className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70"
                    style={{ background: colorBorder }}>
                    <X size={14} style={{ color: colorDark }}/>
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto">
                {!bulkRunning && !bulkDone ? (
                  /* ─── Setup phase ─── */
                  <div className="p-6 space-y-5">

                    {/* Step 1: Selected products */}
                    <div>
                      <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--smc-text-4)' }}>
                        Bước 1 — Sản phẩm sẽ đăng ({selectedIds.size})
                      </div>
                      <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--smc-border)' }}>
                        <div className="max-h-[160px] overflow-y-auto">
                          {products.filter(p => selectedIds.has(p.id)).map(p => (
                            <div key={p.id} className="flex items-center justify-between px-4 py-2.5"
                              style={{ borderBottom: '1px solid var(--smc-border)' }}>
                              <div>
                                <div className="text-[13px] font-medium truncate max-w-[300px]" style={{ color: 'var(--smc-text)' }}>{p.name}</div>
                                <div className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>{p.sku} · Giá: {(p.sale_price || p.price).toLocaleString('vi-VN')}đ · Tồn: {p.stock}</div>
                              </div>
                              <button onClick={() => { setSelectedIds(prev => { const n = new Set(prev); n.delete(p.id); return n; }); }}
                                className="w-6 h-6 flex items-center justify-center rounded-full hover:opacity-70 flex-shrink-0"
                                style={{ background: 'var(--smc-border)' }}>
                                <X size={11} style={{ color: 'var(--smc-text-3)' }}/>
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Step 2: Target shops */}
                    <div>
                      <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--smc-text-4)' }}>
                        Bước 2 — Chọn shop đích
                      </div>
                      {shops.length === 0 ? (
                        <div className="text-[13px] p-4 rounded-[12px]" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>
                          Chưa có shop nào. Vui lòng kết nối shop trước.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex gap-2 mb-1">
                            <button onClick={() => setBulkShopIds(new Set(shops.map(s => s.id)))}
                              className="text-[12px] font-medium px-3 py-1 rounded-[7px] border transition-all hover:opacity-80"
                              style={{ color, borderColor: colorBorder, background: colorLight }}>Chọn tất cả</button>
                            <button onClick={() => setBulkShopIds(new Set())}
                              className="text-[12px] font-medium px-3 py-1 rounded-[7px] border transition-all hover:opacity-80"
                              style={{ color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)' }}>Bỏ chọn</button>
                          </div>
                          {shops.map(s => (
                            <label key={s.id} className="flex items-center gap-3 p-3 rounded-[10px] cursor-pointer transition-all"
                              style={{ border: `1px solid ${bulkShopIds.has(s.id) ? colorBorder : 'var(--smc-border)'}`, background: bulkShopIds.has(s.id) ? colorLight : 'var(--smc-surface)' }}>
                              <input type="checkbox" checked={bulkShopIds.has(s.id)} onChange={() => toggleBulkShop(s.id)} className="w-4 h-4 flex-shrink-0" style={{ accentColor: color }}/>
                              <div className="flex-1 min-w-0">
                                <div className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{s.name}</div>
                                <div className="text-[11px]" style={{ color: 'var(--smc-text-3)' }}>{s.listing_count} SP đang đăng · {s.orders} đơn</div>
                              </div>
                              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                                style={{ background: STATUS_COLOR[s.status] + '15', color: STATUS_COLOR[s.status] }}>
                                {STATUS_LABEL[s.status]}
                              </span>
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Step 3: Price mode */}
                    <div>
                      <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--smc-text-4)' }}>
                        Bước 3 — Cài đặt giá
                      </div>
                      <div className="flex gap-2 mb-3">
                        {([
                          { mode: 'keep' as PriceMode, icon: <Tag size={13}/>, label: 'Giữ giá gốc' },
                          { mode: 'percent' as PriceMode, icon: <Percent size={13}/>, label: 'Giảm theo %' },
                          { mode: 'fixed' as PriceMode, icon: <DollarSign size={13}/>, label: 'Đặt giá cố định' },
                        ]).map(opt => (
                          <button key={opt.mode} onClick={() => setBulkPriceMode(opt.mode)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-[10px] text-[12.5px] font-semibold border transition-all"
                            style={bulkPriceMode === opt.mode
                              ? { background: color, color: '#fff', borderColor: color }
                              : { background: 'var(--smc-surface)', color: 'var(--smc-text-3)', borderColor: 'var(--smc-border)' }}>
                            {opt.icon}{opt.label}
                          </button>
                        ))}
                      </div>
                      {bulkPriceMode !== 'keep' && (
                        <div className="flex items-center gap-3">
                          <input type="number" value={bulkPriceValue} onChange={e => setBulkPriceValue(e.target.value)}
                            placeholder={bulkPriceMode === 'percent' ? 'VD: 10 (giảm 10%)' : 'VD: 250000'}
                            className="flex-1 px-3 py-2 rounded-[10px] text-[13px] outline-none"
                            style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                          <span className="text-[13px]" style={{ color: 'var(--smc-text-3)' }}>
                            {bulkPriceMode === 'percent' ? '%' : 'đ'}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Preview table */}
                    {bulkShopIds.size > 0 && selectedIds.size > 0 && (
                      <div>
                        <div className="text-[12px] font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--smc-text-4)' }}>
                          Preview — {bulkPreviewTasks.length} tác vụ
                        </div>
                        <div className="rounded-[12px] overflow-hidden" style={{ border: '1px solid var(--smc-border)' }}>
                          <div className="max-h-[200px] overflow-y-auto">
                            <table className="w-full">
                              <thead>
                                <tr style={{ borderBottom: '1px solid var(--smc-border)' }}>
                                  {['Sản phẩm', 'Shop', 'Giá đăng'].map((h, i) => (
                                    <th key={i} className="text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {bulkPreviewTasks.map((t, i) => (
                                  <tr key={i} style={{ borderBottom: '1px solid var(--smc-border)' }}>
                                    <td className="px-3 py-2 text-[12px] truncate max-w-[180px]" style={{ color: 'var(--smc-text)' }}>{t.productName}</td>
                                    <td className="px-3 py-2 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{t.shopName}</td>
                                    <td className="px-3 py-2 text-[12px] font-semibold whitespace-nowrap" style={{ color }}>
                                      {t.price.toLocaleString('vi-VN')}đ
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  /* ─── Running / Done phase ─── */
                  <div className="p-6">
                    {/* Progress summary */}
                    <div className="rounded-[14px] p-4 mb-4" style={{ background: colorLight, border: `1px solid ${colorBorder}` }}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[13px] font-bold" style={{ color: colorDark }}>
                          {bulkRunning ? 'Đang đăng...' : 'Hoàn thành!'}
                        </span>
                        <span className="text-[12px]" style={{ color }}>
                          {bulkDoneCount} / {bulkTasks.length} tác vụ
                        </span>
                      </div>
                      <div className="h-2.5 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
                        <div className="h-full rounded-full transition-all duration-300"
                          style={{ width: `${bulkTasks.length > 0 ? (bulkDoneCount / bulkTasks.length) * 100 : 0}%`, background: color }}/>
                      </div>
                      {bulkDone && (
                        <div className="flex gap-4 mt-3 text-[12px] font-semibold">
                          {bulkOkCount > 0 && <span style={{ color: '#16a34a' }}>✓ {bulkOkCount} thành công</span>}
                          {bulkSkipCount > 0 && <span style={{ color: '#d97706' }}>⚡ {bulkSkipCount} đã có</span>}
                          {bulkErrCount > 0 && <span style={{ color: '#dc2626' }}>✗ {bulkErrCount} lỗi</span>}
                        </div>
                      )}
                    </div>

                    {/* Task list */}
                    <div className="space-y-1.5 max-h-[360px] overflow-y-auto">
                      {bulkTasks.map((t, i) => (
                        <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-[10px]"
                          style={{ background: 'var(--smc-surface)', border: `1px solid ${t.state === 'running' ? color : 'var(--smc-border)'}` }}>
                          <div className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{ background: BULK_STATE_COLOR[t.state] + '20' }}>
                            {t.state === 'running' ? (
                              <RefreshCw size={11} className="animate-spin" style={{ color: BULK_STATE_COLOR[t.state] }}/>
                            ) : t.state === 'ok' ? (
                              <CheckCircle size={11} style={{ color: BULK_STATE_COLOR[t.state] }}/>
                            ) : t.state === 'error' ? (
                              <XCircle size={11} style={{ color: BULK_STATE_COLOR[t.state] }}/>
                            ) : t.state === 'skip' ? (
                              <AlertCircle size={11} style={{ color: BULK_STATE_COLOR[t.state] }}/>
                            ) : (
                              <div className="w-2 h-2 rounded-full" style={{ background: BULK_STATE_COLOR[t.state] }}/>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[12.5px] font-medium truncate" style={{ color: 'var(--smc-text)' }}>{t.productName}</span>
                              <span className="text-[11px]" style={{ color: 'var(--smc-text-4)' }}>→</span>
                              <span className="text-[12px]" style={{ color: 'var(--smc-text-3)' }}>{t.shopName}</span>
                            </div>
                            {t.message && <div className="text-[11px] mt-0.5" style={{ color: BULK_STATE_COLOR[t.state] }}>{t.message}</div>}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[11.5px] font-semibold" style={{ color }}>
                              {t.price.toLocaleString('vi-VN')}đ
                            </span>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                              style={{ background: BULK_STATE_COLOR[t.state] + '15', color: BULK_STATE_COLOR[t.state] }}>
                              {BULK_STATE_LABEL[t.state]}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 flex items-center gap-3 flex-shrink-0" style={{ borderTop: '1px solid var(--smc-border)' }}>
                {bulkDone ? (
                  <>
                    <button onClick={() => setBulkOpen(false)}
                      className="flex-1 py-3 rounded-[12px] font-semibold text-[14px] transition-opacity hover:opacity-80"
                      style={{ background: 'var(--smc-border)', color: 'var(--smc-text)' }}>
                      Đóng
                    </button>
                    {bulkErrCount > 0 && (
                      <button onClick={() => { setBulkDone(false); setBulkTasks([]); }}
                        className="flex-1 py-3 rounded-[12px] text-white font-semibold text-[14px]"
                        style={{ background: color }}>
                        Thử lại sản phẩm lỗi
                      </button>
                    )}
                  </>
                ) : bulkRunning ? (
                  <button onClick={() => { bulkAbort.current = true; setBulkRunning(false); }}
                    className="flex-1 py-3 rounded-[12px] font-semibold text-[14px] border transition-opacity hover:opacity-80"
                    style={{ color: '#dc2626', borderColor: '#fecaca' }}>
                    Dừng lại
                  </button>
                ) : (
                  <>
                    <button onClick={() => setBulkOpen(false)}
                      className="py-3 px-5 rounded-[12px] font-semibold text-[13px]"
                      style={{ background: 'var(--smc-border)', color: 'var(--smc-text)' }}>
                      Huỷ
                    </button>
                    <button
                      onClick={startBulkPublish}
                      disabled={bulkShopIds.size === 0 || selectedIds.size === 0}
                      className="flex-1 py-3 rounded-[12px] text-white font-bold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-85 disabled:opacity-40"
                      style={{ background: color }}>
                      <Layers size={16}/>
                      Đăng {bulkPreviewTasks.length} tác vụ lên {label}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ PUBLISH DRAWER (single) ════════════════ */}
      {publishDrawer.open && publishDrawer.product && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30" onClick={() => setPublishDrawer({ open: false, product: null })}/>
          <div className="fixed right-0 top-0 h-full z-50 flex flex-col shadow-2xl"
            style={{ width: 400, background: 'var(--smc-surface)', borderLeft: '1px solid var(--smc-border)' }}>
            <div className="flex items-center justify-between p-5 flex-shrink-0"
              style={{ borderBottom: '1px solid var(--smc-border)', background: colorLight }}>
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: color }}>{logo}</div>
                  <span className="text-[15px] font-bold" style={{ color: colorDark }}>Đăng lên {label}</span>
                </div>
                <div className="text-[12px] mt-0.5 truncate max-w-[280px]" style={{ color }}>{publishDrawer.product.name}</div>
              </div>
              <button onClick={() => setPublishDrawer({ open: false, product: null })}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:opacity-70" style={{ background: colorBorder }}>
                <X size={14} style={{ color: colorDark }}/>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="rounded-[12px] p-3" style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}>
                <div className="text-[11px] font-bold mb-2" style={{ color: 'var(--smc-text-4)' }}>THÔNG TIN SẢN PHẨM</div>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{publishDrawer.product.name}</div>
                <div className="flex gap-3 mt-1.5 text-[12px]" style={{ color: 'var(--smc-text-3)' }}>
                  <span>SKU: {publishDrawer.product.sku}</span>
                  <span>Tồn: {publishDrawer.product.stock}</span>
                  <span>Giá: {publishDrawer.product.price.toLocaleString('vi-VN')}đ</span>
                </div>
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-2)' }}>Chọn shop đăng *</label>
                {shops.length === 0 ? (
                  <div className="text-[12px] p-3 rounded-[10px]" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' }}>Chưa có shop.</div>
                ) : (
                  <select value={publishShopId} onChange={e => setPublishShopId(Number(e.target.value))}
                    className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                    style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                    {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                )}
              </div>
              <div>
                <label className="text-[12px] font-semibold mb-1.5 block" style={{ color: 'var(--smc-text-2)' }}>Giá đăng (đ)</label>
                <input type="number" value={publishPrice} onChange={e => setPublishPrice(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none"
                  style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                <div className="text-[11.5px] mt-1" style={{ color: 'var(--smc-text-4)' }}>
                  Giá gốc: {publishDrawer.product.price.toLocaleString('vi-VN')}đ
                  {publishDrawer.product.sale_price > 0 && ` · Sale: ${publishDrawer.product.sale_price.toLocaleString('vi-VN')}đ`}
                </div>
              </div>
              {publishPrice && (
                <div className="rounded-[12px] p-3" style={{ background: colorLight, border: `1px solid ${colorBorder}` }}>
                  <div className="text-[11px] font-bold mb-2" style={{ color: colorDark }}>DỰ KIẾN LỢI NHUẬN</div>
                  <div className="space-y-1 text-[12px]">
                    <div className="flex justify-between"><span style={{ color: 'var(--smc-text-3)' }}>Giá bán</span><span style={{ color: 'var(--smc-text)' }}>{Number(publishPrice).toLocaleString('vi-VN')}đ</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--smc-text-3)' }}>Phí sàn ({fee}%)</span><span style={{ color: '#dc2626' }}>-{Math.round(Number(publishPrice) * fee / 100).toLocaleString('vi-VN')}đ</span></div>
                    <div className="flex justify-between"><span style={{ color: 'var(--smc-text-3)' }}>Giá vốn</span><span style={{ color: '#dc2626' }}>-{publishDrawer.product.cost_price.toLocaleString('vi-VN')}đ</span></div>
                    <div className="flex justify-between font-bold pt-1" style={{ borderTop: `1px solid ${colorBorder}` }}>
                      <span style={{ color: colorDark }}>Lợi nhuận</span>
                      <span style={{ color: '#16a34a' }}>{Math.round(Number(publishPrice) * (1 - fee / 100) - publishDrawer.product.cost_price).toLocaleString('vi-VN')}đ</span>
                    </div>
                  </div>
                </div>
              )}
              {publishResult && (
                <div className="rounded-[12px] p-3" style={{ background: publishResult.ok ? '#f0fdf4' : '#fef2f2', border: `1px solid ${publishResult.ok ? '#bbf7d0' : '#fecaca'}` }}>
                  <div className="flex items-start gap-2 text-[13px] font-semibold" style={{ color: publishResult.ok ? '#15803d' : '#dc2626' }}>
                    {publishResult.ok ? <CheckCircle size={15}/> : <XCircle size={15}/>}
                    {publishResult.ok ? 'Đăng thành công!' : 'Đăng thất bại'}
                  </div>
                  <div className="text-[12px] mt-1" style={{ color: publishResult.ok ? '#16a34a' : '#ef4444' }}>{publishResult.msg}</div>
                  {publishResult.externalId && <div className="text-[11.5px] mt-1" style={{ color: '#94a3b8' }}>External ID: {publishResult.externalId}</div>}
                </div>
              )}
            </div>
            <div className="p-5 flex-shrink-0" style={{ borderTop: '1px solid var(--smc-border)' }}>
              <button onClick={submitPublish} disabled={publishing || !publishShopId || shops.length === 0}
                className="w-full py-3 rounded-[12px] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-85 disabled:opacity-40"
                style={{ background: color }}>
                {publishing ? <RefreshCw size={16} className="animate-spin"/> : <Zap size={16}/>}
                {publishing ? 'Đang đăng...' : `Đăng lên ${label}`}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ════════════════ CONNECT MODAL ════════════════ */}
      {connectOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.45)' }}
          onClick={() => setConnectOpen(false)}>
          <div className="rounded-[20px] p-6 w-[420px] shadow-2xl" style={{ background: 'var(--smc-surface)' }}
            onClick={e => e.stopPropagation()}>
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
            {configStatus && !configStatus.configured ? (
              <div className="rounded-[12px] p-4 mb-5" style={{ background: '#fffbeb', border: '1px solid #fef08a' }}>
                <div className="flex items-center gap-2 mb-2 text-amber-700 font-semibold text-[13px]">
                  <AlertTriangle size={14}/> Chưa cấu hình API credentials
                </div>
                <p className="text-[12.5px] text-amber-700">
                  Cần thêm {channel === 'tiktok' ? 'TIKTOK_APP_KEY + TIKTOK_APP_SECRET' : 'SHOPEE_PARTNER_ID + SHOPEE_PARTNER_KEY'} vào file <code>.env.local</code> trước.
                </p>
              </div>
            ) : (
              <div className="space-y-2 mb-5 text-[13px]" style={{ color: 'var(--smc-text-2)' }}>
                {[`Nhấn nút bên dưới → chuyển đến trang đăng nhập ${label}`, 'Đăng nhập tài khoản Seller Center và cấp quyền truy cập', 'Hệ thống tự động lưu token và bắt đầu đồng bộ dữ liệu'].map((step, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <ChevronRight size={14} className="mt-0.5 flex-shrink-0" style={{ color }}/>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            )}
            <button onClick={connectOAuth} disabled={configStatus !== null && !configStatus.configured}
              className="w-full py-3 rounded-[12px] text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-opacity hover:opacity-85 disabled:opacity-40"
              style={{ background: color }}>
              <ExternalLink size={16}/> Kết nối {label} ngay
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
