'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Plus, RefreshCw, CheckCircle, XCircle, AlertCircle, Link2,
  Search, LayoutGrid, List, Pencil, Trash2, Power, RotateCcw,
  ChevronDown, X, Store, ShoppingBag, KeyRound, Clock,
} from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import { CHANNEL_LABELS, ChannelBadgeLg, ChannelBadge } from '@/components/ChannelBadge';
import PageShell from '@/components/PageShell';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Shop {
  id: number; name: string; channel: string;
  status: 'active' | 'inactive' | 'error';
  product_count: number; revenue: number; orders: number;
  connected_at: string; last_sync_at: string | null;
  listing_count: number; token_expires_at: string | null;
}
interface ChannelCount { channel: string; count: number; revenue: number; orders: number; }
interface Summary { total: number; active: number; error: number; inactive: number; revenue: number; orders: number; }
interface DrawerData {
  shop: Shop & { token_expires_at: string | null };
  logs: { id: number; shop_name: string; status: string; message: string; created_at: string }[];
  stats: { date: string; revenue: number; orders: number }[];
  listings: { total: number; active: number };
}

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_CHANNELS = [
  { channel: 'tiktok',   label: 'TikTok Shop',  oauth: true },
  { channel: 'shopee',   label: 'Shopee',         oauth: true },
  { channel: 'lazada',   label: 'Lazada',          oauth: false },
  { channel: 'tiki',     label: 'Tiki',            oauth: false },
  { channel: 'facebook', label: 'Facebook Shop',  oauth: false },
  { channel: 'website',  label: 'Website',         oauth: false },
];

const STATUS_ICON  = { active: CheckCircle, inactive: XCircle, error: AlertCircle };
const STATUS_COLOR = { active: '#16a34a', inactive: '#94a3b8', error: '#dc2626' };
const STATUS_LABEL = { active: 'Đang kết nối', inactive: 'Ngừng hoạt động', error: 'Lỗi kết nối' };

const fmtRevenue = (v: number) => `${Math.round(v / 1_000_000).toLocaleString('vi-VN')}M đ`;
const fmtDate    = (s: string | null) => s ? s.slice(0, 10) : '—';
const fmtTime    = (s: string | null) => {
  if (!s) return '—';
  const diff = (Date.now() - new Date(s).getTime()) / 60000;
  if (diff < 60) return `${Math.round(diff)} phút trước`;
  if (diff < 1440) return `${Math.round(diff / 60)} giờ trước`;
  return `${Math.round(diff / 1440)} ngày trước`;
};

// ── Token expiry helpers ──────────────────────────────────────────────────────
type TokenState = 'none' | 'expired' | 'soon' | 'ok';

function tokenState(expiresAt: string | null): TokenState {
  if (!expiresAt) return 'none';
  const diff = (new Date(expiresAt).getTime() - Date.now()) / 86400000; // days
  if (diff < 0) return 'expired';
  if (diff < 7) return 'soon';
  return 'ok';
}

function TokenBadge({ expiresAt, onRefresh, refreshing }: {
  expiresAt: string | null; onRefresh: () => void; refreshing: boolean;
}) {
  const state = tokenState(expiresAt);
  if (state === 'none') return null;

  const cfg = {
    expired: { bg: '#fef2f2', border: '#fecaca', text: '#dc2626', label: 'Token hết hạn',   icon: XCircle },
    soon:    { bg: '#fff7ed', border: '#fed7aa', text: '#ea580c', label: 'Sắp hết hạn',     icon: Clock },
    ok:      { bg: '#f0fdf4', border: '#bbf7d0', text: '#16a34a', label: 'Token còn hạn',   icon: CheckCircle },
  }[state];

  const Icon = cfg.icon;
  const daysLeft = expiresAt ? Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000) : 0;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-semibold"
      style={{ background: cfg.bg, borderColor: cfg.border, color: cfg.text }}>
      <Icon size={10}/>
      {state === 'ok' ? `Còn ${daysLeft}n` : state === 'soon' ? `Còn ${daysLeft}n` : cfg.label}
      {(state === 'expired' || state === 'soon') && (
        <button onClick={e => { e.stopPropagation(); onRefresh(); }}
          disabled={refreshing}
          className="ml-0.5 hover:opacity-70 disabled:opacity-50 transition-opacity"
          title="Refresh token">
          <RefreshCw size={9} className={refreshing ? 'animate-spin' : ''}/>
        </button>
      )}
    </div>
  );
}

// ── Mini Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ data }: { data: { revenue: number }[] }) {
  if (!data.length) return <span className="text-[11px] text-[#94a3b8]">Không có dữ liệu</span>;
  const vals = data.map(d => d.revenue);
  const max = Math.max(...vals, 1);
  const W = 120, H = 36;
  const pts = vals.map((v, i) => {
    const x = vals.length === 1 ? W / 2 : (i / (vals.length - 1)) * W;
    const y = H - (v / max) * H;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
      <polyline points={pts} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinejoin="round"/>
      {vals.map((v, i) => {
        const x = vals.length === 1 ? W / 2 : (i / (vals.length - 1)) * W;
        const y = H - (v / max) * H;
        return <circle key={i} cx={x} cy={y} r="2" fill="#2563eb"/>;
      })}
    </svg>
  );
}

// ── Shop Drawer ────────────────────────────────────────────────────────────────
function ShopDrawer({ shopId, onClose, onRefresh }: { shopId: number; onClose: () => void; onRefresh: () => void }) {
  const [data, setData]         = useState<DrawerData | null>(null);
  const [editName, setEditName] = useState('');
  const [editing, setEditing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [refreshingToken, setRefreshingToken] = useState(false);
  const [tokenMsg, setTokenMsg] = useState('');

  const loadDrawer = useCallback(() => {
    fetch(`/api/shops/${shopId}`).then(r => r.json()).then((d: DrawerData) => {
      setData(d); setEditName(d.shop.name);
    });
  }, [shopId]);

  useEffect(() => { loadDrawer(); }, [loadDrawer]);

  const saveName = async () => {
    if (!editName.trim() || !data) return;
    setSaving(true);
    await fetch(`/api/shops/${shopId}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim() }),
    });
    setSaving(false); setEditing(false);
    onRefresh();
    setData(d => d ? { ...d, shop: { ...d.shop, name: editName.trim() } } : d);
  };

  const handleRefreshToken = async () => {
    setRefreshingToken(true); setTokenMsg('');
    const res = await fetch(`/api/shops/${shopId}/refresh`, { method: 'POST' });
    const json = await res.json();
    setRefreshingToken(false);
    if (res.ok) { setTokenMsg('Token đã được làm mới!'); loadDrawer(); onRefresh(); }
    else { setTokenMsg(json.error ?? 'Lỗi refresh token'); }
  };

  if (!data) return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-[480px] h-full bg-white shadow-2xl flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/>
      </div>
    </div>
  );

  const { shop, logs, stats, listings } = data;
  const ch = CHANNEL_LABELS[shop.channel] ?? { label: shop.channel };
  const StatusIcon = STATUS_ICON[shop.status] ?? CheckCircle;
  const tState = tokenState(shop.token_expires_at);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black/30" onClick={onClose}/>
      <div className="relative w-[480px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f0f3f8] flex-shrink-0">
          <ChannelBadgeLg channel={shop.channel}/>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex items-center gap-2">
                <input autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditing(false); }}
                  className="flex-1 text-[15px] font-semibold border border-[#2563eb] rounded-[8px] px-2 py-0.5 outline-none"/>
                <button onClick={saveName} disabled={saving} className="text-[12px] text-white bg-[#2563eb] px-2.5 py-1 rounded-[7px] font-semibold hover:opacity-85 disabled:opacity-50">{saving ? '...' : 'Lưu'}</button>
                <button onClick={() => setEditing(false)} className="text-[12px] text-[#64748b] px-2 py-1 rounded-[7px] hover:bg-[#f1f5f9]">Hủy</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[15px] font-bold text-[#0f172a] truncate">{shop.name}</span>
                <button onClick={() => setEditing(true)} className="text-[#94a3b8] hover:text-[#2563eb] transition-colors"><Pencil size={13}/></button>
              </div>
            )}
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <StatusIcon size={12} style={{ color: STATUS_COLOR[shop.status] }}/>
              <span className="text-[12px]" style={{ color: STATUS_COLOR[shop.status] }}>{STATUS_LABEL[shop.status]}</span>
              <span className="text-[#e2e8f0]">·</span>
              <span className="text-[12px] text-[#94a3b8]">{ch.label}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#f1f5f9] text-[#94a3b8]"><X size={16}/></button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 px-5 py-4 border-b border-[#f8fafc]">
            {[
              { label: 'Doanh thu', value: fmtRevenue(shop.revenue) },
              { label: 'Đơn hàng', value: shop.orders.toLocaleString('vi-VN') },
              { label: 'Listing', value: `${listings?.total ?? 0}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-[#f8fafc] rounded-[10px] p-3">
                <div className="text-[10.5px] text-[#94a3b8] mb-0.5">{label}</div>
                <div className="text-[14px] font-bold text-[#0f172a]">{value}
                  {label === 'Listing' && <span className="text-[11px] font-medium text-[#16a34a] ml-1">/{listings?.active ?? 0} bán</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Token status section */}
          {tState !== 'none' && (
            <div className="px-5 py-4 border-b border-[#f8fafc]">
              <div className="text-[11.5px] font-semibold text-[#64748b] uppercase tracking-wider mb-3 flex items-center gap-1.5">
                <KeyRound size={11}/> OAuth Token
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <TokenBadge expiresAt={shop.token_expires_at} onRefresh={handleRefreshToken} refreshing={refreshingToken}/>
                  {shop.token_expires_at && (
                    <div className="text-[11px] text-[#94a3b8] mt-1">Hết hạn: {shop.token_expires_at.slice(0, 10)}</div>
                  )}
                </div>
                {(tState === 'expired' || tState === 'soon') && (
                  <button onClick={handleRefreshToken} disabled={refreshingToken}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] bg-[#eff6ff] text-[#2563eb] text-[12px] font-semibold hover:bg-[#dbeafe] disabled:opacity-50 transition-colors">
                    <RefreshCw size={12} className={refreshingToken ? 'animate-spin' : ''}/> Làm mới token
                  </button>
                )}
              </div>
              {tokenMsg && (
                <div className={`mt-2 text-[12px] font-medium ${tokenMsg.includes('Lỗi') || tokenMsg.includes('lỗi') ? 'text-[#dc2626]' : 'text-[#16a34a]'}`}>{tokenMsg}</div>
              )}
            </div>
          )}

          {/* Sparkline */}
          <div className="px-5 py-4 border-b border-[#f8fafc]">
            <div className="text-[11.5px] font-semibold text-[#64748b] uppercase tracking-wider mb-3">Doanh thu 7 ngày</div>
            <div className="flex items-center gap-4">
              <Sparkline data={stats}/>
              <div className="text-[11px] text-[#94a3b8]">
                {stats.length > 0 ? `Tổng: ${fmtRevenue(stats.reduce((a, s) => a + s.revenue, 0))}` : 'Chưa có dữ liệu'}
              </div>
            </div>
          </div>

          {/* Info */}
          <div className="px-5 py-4 border-b border-[#f8fafc]">
            <div className="text-[11.5px] font-semibold text-[#64748b] uppercase tracking-wider mb-3">Thông tin kết nối</div>
            <div className="space-y-2">
              {[
                ['Kênh', ch.label],
                ['Ngày kết nối', fmtDate(shop.connected_at)],
                ['Sản phẩm', shop.product_count.toLocaleString('vi-VN')],
                ['Sync cuối', fmtTime(shop.last_sync_at)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-[12.5px]">
                  <span className="text-[#94a3b8]">{k}</span>
                  <span className="text-[#374151] font-medium">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Sync logs */}
          <div className="px-5 py-4">
            <div className="text-[11.5px] font-semibold text-[#64748b] uppercase tracking-wider mb-3">Lịch sử đồng bộ</div>
            {logs.length === 0 ? (
              <div className="text-[12.5px] text-[#94a3b8]">Chưa có lịch sử đồng bộ</div>
            ) : (
              <div className="space-y-1">
                {logs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2.5 py-1.5 border-b border-[#f8fafc] last:border-0">
                    <span className={`mt-1 flex-shrink-0 w-1.5 h-1.5 rounded-full ${log.status === 'success' ? 'bg-[#16a34a]' : 'bg-[#dc2626]'}`}/>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] text-[#374151] truncate">{log.message || (log.status === 'success' ? 'Đồng bộ thành công' : 'Lỗi đồng bộ')}</div>
                      <div className="text-[11px] text-[#94a3b8]">{fmtTime(log.created_at)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Connect Modal ──────────────────────────────────────────────────────────────
function ConnectModal({ onClose, onAdd }: { onClose: () => void; onAdd: () => void }) {
  const [tab, setTab]           = useState<'oauth' | 'manual'>('oauth');
  const [manualName, setManualName]       = useState('');
  const [manualChannel, setManualChannel] = useState('website');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg]       = useState('');

  const handleOAuth = async (channel: string) => {
    setMsg('');
    const res = await fetch(`/api/channels/${channel}/connect`);
    const d = await res.json();
    if (res.ok && d.authUrl) { window.location.href = d.authUrl; }
    else { setMsg(d.error ?? 'Không khởi tạo được kết nối'); }
  };

  const handleManual = async () => {
    if (!manualName.trim()) { setMsg('Vui lòng nhập tên shop'); return; }
    setSaving(true);
    await fetch('/api/shops', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: manualName.trim(), channel: manualChannel }),
    });
    setSaving(false); onAdd(); onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[20px] p-6 w-[500px] shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-[17px] font-bold text-[#0f172a]">Kết nối sàn bán hàng</h3>
            <p className="text-[12.5px] text-[#64748b] mt-0.5">Thêm shop mới vào hệ thống</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-[8px] hover:bg-[#f1f5f9] text-[#94a3b8]"><X size={16}/></button>
        </div>

        <div className="flex gap-1 bg-[#f1f5f9] rounded-[10px] p-1 mb-4">
          {([['oauth', 'Kết nối OAuth'], ['manual', 'Thêm thủ công']] as [string, string][]).map(([k, v]) => (
            <button key={k} onClick={() => setTab(k as 'oauth' | 'manual')}
              className={`flex-1 text-[13px] font-semibold py-1.5 rounded-[8px] transition-all ${tab === k ? 'bg-white text-[#0f172a] shadow-sm' : 'text-[#64748b]'}`}>{v}</button>
          ))}
        </div>

        {tab === 'oauth' ? (
          <div className="space-y-2">
            {ALL_CHANNELS.map(c => (
              <div key={c.channel} className="flex items-center gap-3 p-3.5 rounded-[12px] border border-[#e8edf5]">
                <ChannelBadgeLg channel={c.channel}/>
                <div className="flex-1">
                  <div className="text-[14px] font-semibold text-[#0f172a]">{c.label}</div>
                  <div className="text-[11.5px] text-[#94a3b8]">{c.oauth ? 'Kết nối qua OAuth chính thức' : 'Tính năng đang phát triển'}</div>
                </div>
                {c.oauth ? (
                  <button onClick={() => handleOAuth(c.channel)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-[#eff6ff] text-[#2563eb] text-[12px] font-semibold hover:bg-[#dbeafe] transition-colors">
                    <Link2 size={13}/> Kết nối
                  </button>
                ) : (
                  <span className="px-2.5 py-1 rounded-[8px] bg-[#f1f5f9] text-[#94a3b8] text-[11.5px] font-semibold">Sắp có</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label className="text-[12.5px] font-semibold text-[#374151] mb-1.5 block">Tên shop</label>
              <input value={manualName} onChange={e => setManualName(e.target.value)}
                placeholder="VD: Shop Thời Trang ABC"
                className="w-full h-10 px-3.5 border border-[#e8edf5] rounded-[10px] text-[13.5px] outline-none focus:border-[#2563eb] transition-colors"/>
            </div>
            <div>
              <label className="text-[12.5px] font-semibold text-[#374151] mb-1.5 block">Kênh bán hàng</label>
              <div className="relative">
                <select value={manualChannel} onChange={e => setManualChannel(e.target.value)}
                  className="w-full h-10 px-3.5 border border-[#e8edf5] rounded-[10px] text-[13.5px] outline-none focus:border-[#2563eb] appearance-none bg-white transition-colors">
                  {ALL_CHANNELS.map(c => <option key={c.channel} value={c.channel}>{c.label}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-3 text-[#94a3b8] pointer-events-none"/>
              </div>
            </div>
          </div>
        )}

        {msg && (
          <div className="mt-3 p-3 bg-[#fff7ed] border border-[#fed7aa] rounded-[10px] text-[12.5px] text-[#ea580c]">{msg}</div>
        )}

        <div className="flex gap-2 mt-5">
          <button onClick={onClose} className="flex-1 h-10 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Đóng</button>
          {tab === 'manual' && (
            <button onClick={handleManual} disabled={saving}
              className="flex-1 h-10 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 disabled:opacity-50 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
              {saving ? 'Đang lưu...' : 'Thêm shop'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function ShopsPage() {
  const [data, setData]             = useState<{ shops: Shop[]; counts: ChannelCount[]; summary: Summary } | null>(null);
  const [filterChannel, setFilterChannel] = useState('');
  const [filterStatus,  setFilterStatus]  = useState('');
  const [search,   setSearch]       = useState('');
  const [sort,     setSort]         = useState('channel');
  const [view,     setView]         = useState<'table' | 'grid'>('table');
  const [syncing,  setSyncing]      = useState<number | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [showConnect, setShowConnect] = useState(false);
  const [drawerId, setDrawerId]     = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [refreshingToken, setRefreshingToken] = useState<number | null>(null);

  // ── Bulk select state ──────────────────────────────────────────────────────
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [bulkAction, setBulkAction] = useState(false);

  const buildUrl = useCallback(() => {
    const p = new URLSearchParams();
    if (filterChannel) p.set('channel', filterChannel);
    if (filterStatus)  p.set('status',  filterStatus);
    if (search.trim()) p.set('q', search.trim());
    if (sort)          p.set('sort', sort);
    return `/api/shops?${p}`;
  }, [filterChannel, filterStatus, search, sort]);

  const load = useCallback(() => {
    setSelected(new Set());
    fetch(buildUrl()).then(r => r.json()).then(setData);
  }, [buildUrl]);

  useEffect(() => { load(); }, [load]);

  const handleSync = async (shopId: number) => {
    setSyncing(shopId);
    await fetch('/api/channels/sync', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId }),
    });
    load(); setSyncing(null);
  };

  const handleSyncAll = async () => {
    if (!data) return;
    setSyncingAll(true);
    await Promise.all(data.shops.filter(s => s.status === 'active').map(s =>
      fetch('/api/channels/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: s.id }) })
    ));
    load(); setSyncingAll(false);
  };

  const toggleStatus = async (s: Shop) => {
    await fetch(`/api/shops/${s.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: s.status === 'active' ? 'inactive' : 'active' }),
    });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xoá shop này sẽ xoá toàn bộ listings liên quan. Xác nhận?')) return;
    setDeletingId(id);
    await fetch(`/api/shops/${id}`, { method: 'DELETE' });
    setDeletingId(null); load();
  };

  const handleRefreshToken = async (shopId: number) => {
    setRefreshingToken(shopId);
    await fetch(`/api/shops/${shopId}/refresh`, { method: 'POST' });
    setRefreshingToken(null); load();
  };

  // ── Bulk helpers ───────────────────────────────────────────────────────────
  const toggleSelect = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!data) return;
    if (selected.size === data.shops.length) setSelected(new Set());
    else setSelected(new Set(data.shops.map(s => s.id)));
  };

  const handleBulkSync = async () => {
    if (!data) return;
    setBulkAction(true);
    await Promise.all(Array.from(selected).map(id =>
      fetch('/api/channels/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ shopId: id }) })
    ));
    setBulkAction(false); load();
  };

  const handleBulkStatus = async (status: 'active' | 'inactive') => {
    setBulkAction(true);
    await Promise.all(Array.from(selected).map(id =>
      fetch(`/api/shops/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
    ));
    setBulkAction(false); load();
  };

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const { shops, counts, summary } = data;
  const errorShops = shops.filter(s => s.status === 'error');
  const allSelected = shops.length > 0 && selected.size === shops.length;
  const someSelected = selected.size > 0 && !allSelected;

  return (
    <PageShell
      title="Shop kết nối"
      subtitle="Quản lý tất cả các shop trên các kênh bán hàng"
      action={
        <div className="flex items-center gap-2">
          <button onClick={handleSyncAll} disabled={syncingAll}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] border border-[#e8edf5] text-[13px] font-semibold text-[#374151] hover:bg-[#f8fafc] disabled:opacity-50 transition-all">
            <RefreshCw size={14} className={syncingAll ? 'animate-spin' : ''}/>
            {syncingAll ? 'Đang sync...' : 'Sync tất cả'}
          </button>
          <button onClick={() => setShowConnect(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
            <Plus size={15} strokeWidth={2.5}/> Kết nối shop mới
          </button>
        </div>
      }
    >
      {showConnect && <ConnectModal onClose={() => setShowConnect(false)} onAdd={load}/>}
      {drawerId !== null && (
        <ShopDrawer shopId={drawerId} onClose={() => setDrawerId(null)} onRefresh={load}/>
      )}

      {/* Error banner */}
      {errorShops.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 mb-5 bg-[#fef2f2] border border-[#fecaca] rounded-[12px]">
          <AlertCircle size={16} className="text-[#dc2626] flex-shrink-0"/>
          <span className="text-[13px] text-[#dc2626] font-medium">
            {errorShops.length} shop lỗi: {errorShops.map(s => s.name).join(', ')}
          </span>
          <button onClick={() => errorShops.forEach(s => handleSync(s.id))}
            className="ml-auto flex items-center gap-1 text-[12px] text-[#dc2626] font-semibold hover:opacity-70 whitespace-nowrap">
            <RotateCcw size={12}/> Kết nối lại
          </button>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-5 gap-3.5 mb-5">
        {[
          { label: 'Tổng shop',    value: summary?.total ?? 0,                              icon: Store,       color: '#2563eb' },
          { label: 'Đang kết nối', value: summary?.active ?? 0,                             icon: CheckCircle, color: '#16a34a' },
          { label: 'Lỗi / Ngừng', value: (summary?.error ?? 0) + (summary?.inactive ?? 0), icon: XCircle,     color: '#dc2626' },
          { label: 'Doanh thu',    value: fmtRevenue(summary?.revenue ?? 0),                icon: ShoppingBag, color: '#7c3aed' },
          { label: 'Đơn hàng',    value: (summary?.orders ?? 0).toLocaleString('vi-VN'),   icon: RefreshCw,   color: '#0891b2' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-[#e8edf5] rounded-[16px] p-4" style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{ background: `${color}18` }}>
                <Icon size={14} style={{ color }}/>
              </div>
              <span className="text-[11.5px] text-[#64748b] font-medium">{label}</span>
            </div>
            <div className="text-[22px] font-extrabold text-[#0f172a]">{value}</div>
          </div>
        ))}
      </div>

      {/* Channel cards */}
      <div className="grid grid-cols-6 gap-3 mb-5">
        {(counts as ChannelCount[]).map(c => {
          const ch = CHANNEL_LABELS[c.channel] ?? { label: c.channel };
          return (
            <button key={c.channel} onClick={() => setFilterChannel(filterChannel === c.channel ? '' : c.channel)}
              className={`bg-white border rounded-[14px] p-3.5 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${filterChannel === c.channel ? 'border-[#2563eb] ring-1 ring-[#2563eb]' : 'border-[#e8edf5]'}`}
              style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div className="mb-2"><ChannelBadgeLg channel={c.channel}/></div>
              <div className="text-[11px] text-[#64748b] mb-0.5">{ch.label}</div>
              <div className="text-[18px] font-extrabold text-[#0f172a]">{c.count} <span className="text-[11px] font-medium text-[#94a3b8]">shop</span></div>
              <div className="text-[10.5px] text-[#64748b] mt-0.5">{Math.round(c.revenue / 1_000_000).toLocaleString('vi-VN')}M</div>
            </button>
          );
        })}
      </div>

      {/* Filter + list */}
      <Card>
        <div className="flex items-center gap-2.5 flex-wrap mb-4">
          <div className="relative flex-1 min-w-[180px]">
            <Search size={14} className="absolute left-3 top-2.5 text-[#94a3b8]"/>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Tìm tên shop..."
              className="w-full h-9 pl-9 pr-3 border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] transition-colors bg-[#f8fafc]"/>
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="h-9 px-3 border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] bg-white transition-colors">
            <option value="">Tất cả trạng thái</option>
            <option value="active">Đang kết nối</option>
            <option value="inactive">Ngừng hoạt động</option>
            <option value="error">Lỗi kết nối</option>
          </select>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="h-9 px-3 border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] bg-white transition-colors">
            <option value="channel">Sắp xếp: Kênh</option>
            <option value="revenue">Sắp xếp: Doanh thu</option>
            <option value="orders">Sắp xếp: Đơn hàng</option>
            <option value="connected_at">Sắp xếp: Mới nhất</option>
            <option value="name">Sắp xếp: Tên A-Z</option>
          </select>
          {(filterChannel || filterStatus || search) && (
            <button onClick={() => { setFilterChannel(''); setFilterStatus(''); setSearch(''); }}
              className="flex items-center gap-1 text-[12.5px] text-[#64748b] hover:text-[#0f172a] transition-colors">
              <X size={13}/> Xoá lọc
            </button>
          )}
          <div className="ml-auto flex items-center gap-0.5 border border-[#e8edf5] rounded-[9px] p-0.5">
            <button onClick={() => setView('table')}
              className={`p-1.5 rounded-[7px] transition-colors ${view === 'table' ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#94a3b8]'}`}><List size={15}/></button>
            <button onClick={() => setView('grid')}
              className={`p-1.5 rounded-[7px] transition-colors ${view === 'grid' ? 'bg-[#f1f5f9] text-[#0f172a]' : 'text-[#94a3b8]'}`}><LayoutGrid size={15}/></button>
          </div>
        </div>

        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center gap-2.5 px-4 py-2.5 mb-3 bg-[#eff6ff] border border-[#bfdbfe] rounded-[10px]">
            <span className="text-[13px] font-semibold text-[#2563eb]">Đã chọn {selected.size} shop</span>
            <div className="flex items-center gap-1.5 ml-2">
              <button onClick={handleBulkSync} disabled={bulkAction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#bfdbfe] text-[12.5px] font-semibold text-[#2563eb] hover:bg-[#dbeafe] disabled:opacity-50 transition-colors">
                <RefreshCw size={12} className={bulkAction ? 'animate-spin' : ''}/> Sync
              </button>
              <button onClick={() => handleBulkStatus('active')} disabled={bulkAction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#bfdbfe] text-[12.5px] font-semibold text-[#16a34a] hover:bg-[#f0fdf4] disabled:opacity-50 transition-colors">
                <Power size={12}/> Bật tất cả
              </button>
              <button onClick={() => handleBulkStatus('inactive')} disabled={bulkAction}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-[8px] bg-white border border-[#bfdbfe] text-[12.5px] font-semibold text-[#64748b] hover:bg-[#f1f5f9] disabled:opacity-50 transition-colors">
                <Power size={12}/> Tắt tất cả
              </button>
            </div>
            <button onClick={() => setSelected(new Set())}
              className="ml-auto text-[#94a3b8] hover:text-[#374151] transition-colors"><X size={14}/></button>
          </div>
        )}

        <SectionHeader
          title={`Danh sách shop${filterChannel ? ` · ${CHANNEL_LABELS[filterChannel]?.label ?? filterChannel}` : ''}${filterStatus ? ` · ${STATUS_LABEL[filterStatus as keyof typeof STATUS_LABEL]}` : ''} (${shops.length})`}
          action={null}
        />

        {/* Table view */}
        {view === 'table' && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0f3f8]">
                  <th className="px-3 py-2.5 w-8">
                    <input type="checkbox" checked={allSelected} ref={el => { if (el) el.indeterminate = someSelected; }}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-[#2563eb] cursor-pointer"/>
                  </th>
                  {['Tên shop', 'Kênh', 'Trạng thái', 'Token', 'Sản phẩm', 'Listing', 'Doanh thu', 'Đơn hàng', 'Sync cuối', ''].map((h, i) => (
                    <th key={i} className="text-left text-[10.5px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shops.map(s => {
                  const Icon = STATUS_ICON[s.status] ?? CheckCircle;
                  const ch = CHANNEL_LABELS[s.channel] ?? { label: s.channel, bg: '#64748b' };
                  const tState = tokenState(s.token_expires_at);
                  return (
                    <tr key={s.id} className={`border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors ${selected.has(s.id) ? 'bg-[#f0f9ff]' : ''}`}>
                      <td className="px-3 py-3">
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                          className="w-3.5 h-3.5 rounded accent-[#2563eb] cursor-pointer"/>
                      </td>
                      <td className="px-3 py-3">
                        <button onClick={() => setDrawerId(s.id)} className="font-semibold text-[13px] text-[#0f172a] hover:text-[#2563eb] transition-colors text-left">{s.name}</button>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11.5px] font-semibold text-white" style={{ background: (ch as { bg?: string }).bg ?? '#64748b' }}>
                          <ChannelBadge channel={s.channel}/> {ch.label}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <span className="inline-flex items-center gap-1 text-[12.5px] font-medium" style={{ color: STATUS_COLOR[s.status] }}>
                          <Icon size={12}/> {STATUS_LABEL[s.status]}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        {tState !== 'none' && (
                          <TokenBadge
                            expiresAt={s.token_expires_at}
                            onRefresh={() => handleRefreshToken(s.id)}
                            refreshing={refreshingToken === s.id}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 text-[13px] text-[#374151]">{s.product_count.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-3 text-[13px] text-[#374151]">{(s.listing_count ?? 0).toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-3 text-[13px] font-semibold text-[#0f172a]">{fmtRevenue(s.revenue)}</td>
                      <td className="px-3 py-3 text-[13px] text-[#374151]">{s.orders.toLocaleString('vi-VN')}</td>
                      <td className="px-3 py-3 text-[12px] text-[#64748b]">{fmtTime(s.last_sync_at)}</td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-0.5">
                          <button title="Đồng bộ" onClick={() => handleSync(s.id)} disabled={syncing === s.id}
                            className="p-1.5 rounded-[7px] text-[#2563eb] hover:bg-[#eff6ff] disabled:opacity-50 transition-colors">
                            <RefreshCw size={13} className={syncing === s.id ? 'animate-spin' : ''}/>
                          </button>
                          <button title={s.status === 'active' ? 'Tắt shop' : 'Bật shop'} onClick={() => toggleStatus(s)}
                            className={`p-1.5 rounded-[7px] transition-colors ${s.status === 'active' ? 'text-[#16a34a] hover:bg-[#f0fdf4]' : 'text-[#94a3b8] hover:bg-[#f1f5f9]'}`}>
                            <Power size={13}/>
                          </button>
                          <button title="Xoá" onClick={() => handleDelete(s.id)} disabled={deletingId === s.id}
                            className="p-1.5 rounded-[7px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fef2f2] disabled:opacity-50 transition-colors">
                            <Trash2 size={13}/>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {shops.length === 0 && (
                  <tr><td colSpan={11} className="px-3 py-10 text-center text-[13px] text-[#94a3b8]">Không tìm thấy shop nào</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Grid view */}
        {view === 'grid' && (
          <div className="grid grid-cols-3 gap-3">
            {shops.map(s => {
              const Icon = STATUS_ICON[s.status] ?? CheckCircle;
              return (
                <div key={s.id}
                  className={`border rounded-[14px] p-4 hover:shadow-md transition-all ${selected.has(s.id) ? 'border-[#2563eb] bg-[#f0f9ff]' : 'border-[#e8edf5] hover:border-[#cbd5e1]'}`}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <button onClick={() => toggleSelect(s.id)}>
                        <input type="checkbox" checked={selected.has(s.id)} onChange={() => toggleSelect(s.id)}
                          className="w-3.5 h-3.5 rounded accent-[#2563eb] cursor-pointer" onClick={e => e.stopPropagation()}/>
                      </button>
                      <ChannelBadgeLg channel={s.channel}/>
                      <div>
                        <button onClick={() => setDrawerId(s.id)} className="text-[13.5px] font-bold text-[#0f172a] hover:text-[#2563eb] transition-colors text-left leading-tight">{s.name}</button>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Icon size={11} style={{ color: STATUS_COLOR[s.status] }}/>
                          <span className="text-[11px]" style={{ color: STATUS_COLOR[s.status] }}>{STATUS_LABEL[s.status]}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-0.5 flex-shrink-0">
                      <button title="Đồng bộ" onClick={() => handleSync(s.id)} disabled={syncing === s.id}
                        className="p-1.5 rounded-[7px] text-[#94a3b8] hover:text-[#2563eb] hover:bg-[#eff6ff] transition-colors">
                        <RefreshCw size={13} className={syncing === s.id ? 'animate-spin' : ''}/>
                      </button>
                      <button title={s.status === 'active' ? 'Tắt' : 'Bật'} onClick={() => toggleStatus(s)}
                        className={`p-1.5 rounded-[7px] transition-colors ${s.status === 'active' ? 'text-[#16a34a] hover:bg-[#f0fdf4]' : 'text-[#94a3b8] hover:bg-[#f1f5f9]'}`}>
                        <Power size={13}/>
                      </button>
                      <button title="Xoá" onClick={() => handleDelete(s.id)}
                        className="p-1.5 rounded-[7px] text-[#94a3b8] hover:text-[#dc2626] hover:bg-[#fef2f2] transition-colors">
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </div>
                  {s.token_expires_at && (
                    <div className="mb-2">
                      <TokenBadge expiresAt={s.token_expires_at} onRefresh={() => handleRefreshToken(s.id)} refreshing={refreshingToken === s.id}/>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-[#f8fafc] rounded-[8px] p-2">
                      <div className="text-[10px] text-[#94a3b8]">Doanh thu</div>
                      <div className="text-[13px] font-bold text-[#0f172a]">{fmtRevenue(s.revenue)}</div>
                    </div>
                    <div className="bg-[#f8fafc] rounded-[8px] p-2">
                      <div className="text-[10px] text-[#94a3b8]">Đơn hàng</div>
                      <div className="text-[13px] font-bold text-[#0f172a]">{s.orders.toLocaleString('vi-VN')}</div>
                    </div>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#94a3b8]">
                    <span>Sync: {fmtTime(s.last_sync_at)}</span>
                    <span>{s.listing_count ?? 0} listings</span>
                  </div>
                </div>
              );
            })}
            {shops.length === 0 && (
              <div className="col-span-3 py-10 text-center text-[13px] text-[#94a3b8]">Không tìm thấy shop nào</div>
            )}
          </div>
        )}
      </Card>
    </PageShell>
  );
}
