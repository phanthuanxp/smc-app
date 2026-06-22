'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, Trash2, Edit, X, Bot, Zap, ChevronDown,
  TrendingUp, Package, AlertTriangle, XCircle, Star, Rocket, Copy, Check, Loader2,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import { ChannelBadge, CHANNEL_LABELS } from '@/components/ChannelBadge';

// ── Types ──────────────────────────────────────────────────────────────────
interface Product {
  id: number; sku: string; name: string; category: string; description: string;
  price: number; cost_price: number; sale_price: number; stock: number; weight: number;
  status: string; channels: string | null; listing_count: number;
  total_views: number; total_sales: number; seo_score: number; profit_margin: number;
}
interface Stats { total: number; active: number; out_of_stock: number; low_stock: number; }

// ── SEO score helper ───────────────────────────────────────────────────────
function SeoBar({ score }: { score: number }) {
  const color = score >= 70 ? '#16a34a' : score >= 40 ? '#ea580c' : '#dc2626';
  const label = score >= 70 ? 'Tốt' : score >= 40 ? 'TB' : 'Kém';
  return (
    <div className="flex items-center gap-1.5 min-w-[80px]">
      <div className="flex-1 h-1.5 bg-[#f1f5f9] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${score}%`, background: color }}/>
      </div>
      <span className="text-[11px] font-bold tabular-nums" style={{ color }}>{score}</span>
      <span className="text-[9.5px] font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ── SEO breakdown detail ───────────────────────────────────────────────────
function SeoBreakdown({ name, description, salePrice }: { name: string; description: string; salePrice: number }) {
  const len = name.length;
  const items = [
    { label: 'Tên 40-80 ký tự', ok: len >= 40 && len <= 80, pts: 30, hint: `Hiện: ${len} ký tự` },
    { label: 'Tên 20+ ký tự', ok: len >= 20, pts: 18, hint: '' },
    { label: 'Có mô tả sản phẩm', ok: !!(description?.trim()), pts: 25, hint: '' },
    { label: 'Mô tả > 100 ký tự', ok: (description?.trim().length ?? 0) > 100, pts: 15, hint: `Hiện: ${description?.trim().length ?? 0} ký tự` },
    { label: 'Từ khoá bán hàng', ok: ['chính hãng','cao cấp','chất lượng','sale','hot','best','free ship'].some(k=>(name+description).toLowerCase().includes(k)), pts: 10, hint: '' },
    { label: 'Có giá khuyến mãi', ok: salePrice > 0, pts: 10, hint: '' },
  ];
  return (
    <div className="space-y-1.5 mt-2">
      {items.map((it, i) => (
        <div key={i} className="flex items-center justify-between text-[11.5px]">
          <span className={`flex items-center gap-1.5 ${it.ok ? 'text-[#374151]' : 'text-[#94a3b8]'}`}>
            <span className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${it.ok ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'}`}>
              {it.ok ? '✓' : '–'}
            </span>
            {it.label}{it.hint ? ` (${it.hint})` : ''}
          </span>
          <span className={`font-semibold ${it.ok ? 'text-[#16a34a]' : 'text-[#cbd5e1]'}`}>+{it.pts}</span>
        </div>
      ))}
    </div>
  );
}

// ── Edit / AI Drawer ───────────────────────────────────────────────────────
const AI_ACTIONS = [
  { id: 'title',       label: 'Tối ưu Tiêu đề', icon: '✏️' },
  { id: 'description', label: 'Viết Mô tả',     icon: '📝' },
  { id: 'seo',         label: 'Phân tích SEO',   icon: '🔍' },
];

function ProductDrawer({ product, onClose, onSaved }: {
  product: Product;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [tab, setTab]       = useState<'edit' | 'ai' | 'seo'>('edit');
  const [form, setForm]     = useState({ ...product });
  const [saving, setSaving] = useState(false);
  const [aiAction, setAiAction] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [shops, setShops]   = useState<{ id: number; name: string; channel: string }[]>([]);
  const [deploying, setDeploying] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(d => setShops((d.shops ?? []).filter((s: {status:string}) => s.status === 'active')));
  }, []);

  const profit = form.price > 0 ? Math.round(((form.price - form.cost_price) / form.price) * 100) : 0;
  const effectivePrice = form.sale_price > 0 ? form.sale_price : form.price;
  const effectiveProfit = form.price > 0 ? Math.round(((effectivePrice - form.cost_price) / effectivePrice) * 100) : 0;

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    onSaved();
  };

  const runAi = async (action: string) => {
    setAiAction(action);
    setAiResult('');
    setAiLoading(true);
    const input = `Tên: ${form.name}\nDanh mục: ${form.category}\nMô tả: ${form.description || 'Chưa có'}\nGiá: ${form.price.toLocaleString('vi-VN')}đ`;
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, input }),
    });
    const data = await res.json();
    setAiLoading(false);
    setAiResult(data.result ?? data.error ?? 'Lỗi không xác định');
  };

  const applyAiResult = (action: string) => {
    if (action === 'title') setForm(f => ({ ...f, name: aiResult.split('\n')[0].slice(0, 120) }));
    if (action === 'description') setForm(f => ({ ...f, description: aiResult }));
    setTab('edit');
  };

  const deployToShop = async (shopId: number) => {
    setDeploying(shopId);
    await fetch('/api/channels/publish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, productId: product.id }),
    });
    setDeploying(null);
  };

  const f = (n: number) => n.toLocaleString('vi-VN');

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose}/>
      <div className="w-[480px] bg-white h-full shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f3f8]">
          <div className="flex-1 min-w-0 mr-3">
            <p className="text-[13px] font-bold text-[#0f172a] truncate">{product.name}</p>
            <p className="text-[11px] text-[#94a3b8]">{product.sku} · {product.category}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f1f5f9] text-[#94a3b8]">
            <X size={15}/>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[#f0f3f8]">
          {[
            { id: 'edit', label: 'Chỉnh sửa', icon: <Edit size={13}/> },
            { id: 'ai',   label: 'AI Tối ưu',  icon: <Bot size={13}/> },
            { id: 'seo',  label: 'SEO',         icon: <Star size={13}/> },
          ].map(t => (
            <button key={t.id} onClick={() => setTab(t.id as 'edit'|'ai'|'seo')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-semibold transition-colors border-b-2 ${tab === t.id ? 'border-[#2563eb] text-[#2563eb]' : 'border-transparent text-[#64748b] hover:text-[#374151]'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {tab === 'edit' && (
            <>
              {/* Basic info */}
              <div>
                <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Thông tin cơ bản</p>
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Tên sản phẩm</label>
                    <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"/>
                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">{form.name.length}/120 · Tối ưu: 40-80 ký tự</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">SKU</label>
                      <input value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                        className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb]"/>
                    </div>
                    <div>
                      <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Danh mục</label>
                      <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                        className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb]"/>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-semibold text-[#64748b] mb-1">Mô tả</label>
                    <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={3}
                      className="w-full px-3 py-2 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] resize-none"/>
                    <p className="text-[10.5px] text-[#94a3b8] mt-0.5">{(form.description || '').length} ký tự · Tối ưu: 100+</p>
                  </div>
                </div>
              </div>

              {/* Pricing */}
              <div>
                <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Giá & Kho</p>
                <div className="grid grid-cols-3 gap-2.5 mb-2.5">
                  {[
                    { label: 'Giá nhập', field: 'cost_price', color: '#64748b' },
                    { label: 'Giá bán', field: 'price', color: '#0f172a' },
                    { label: 'Giá sale', field: 'sale_price', color: '#dc2626' },
                  ].map(({ label, field, color }) => (
                    <div key={field}>
                      <label className="block text-[11px] font-semibold mb-1" style={{ color: '#64748b' }}>{label}</label>
                      <input
                        type="number"
                        value={form[field as keyof typeof form] as number}
                        onChange={e => setForm(f => ({ ...f, [field]: Number(e.target.value) }))}
                        className="w-full h-9 px-2.5 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[12.5px] font-semibold outline-none focus:border-[#2563eb]"
                        style={{ color }}
                      />
                    </div>
                  ))}
                </div>
                {/* Profit display */}
                <div className="grid grid-cols-2 gap-2 p-3 bg-[#f8fafc] rounded-[10px]">
                  <div>
                    <p className="text-[10.5px] text-[#64748b]">Biên LN (giá bán)</p>
                    <p className="text-[15px] font-extrabold" style={{ color: profit >= 20 ? '#16a34a' : profit >= 0 ? '#ea580c' : '#dc2626' }}>{profit}%</p>
                    <p className="text-[10.5px] text-[#64748b]">{f(form.price - form.cost_price)}đ / SP</p>
                  </div>
                  {form.sale_price > 0 && (
                    <div>
                      <p className="text-[10.5px] text-[#64748b]">Biên LN (giá sale)</p>
                      <p className="text-[15px] font-extrabold" style={{ color: effectiveProfit >= 20 ? '#16a34a' : effectiveProfit >= 0 ? '#ea580c' : '#dc2626' }}>{effectiveProfit}%</p>
                      <p className="text-[10.5px] text-[#64748b]">{f(form.sale_price - form.cost_price)}đ / SP</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2.5 mt-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748b] mb-1">Tồn kho</label>
                    <input type="number" value={form.stock} onChange={e => setForm(f => ({ ...f, stock: Number(e.target.value) }))}
                      className="w-full h-9 px-2.5 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] font-semibold outline-none focus:border-[#2563eb]"/>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748b] mb-1">Trạng thái</label>
                    <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                      className="w-full h-9 px-2.5 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] cursor-pointer">
                      <option value="active">Đang bán</option>
                      <option value="inactive">Ngừng bán</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Deploy to channels */}
              <div>
                <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Deploy lên sàn</p>
                <div className="space-y-1.5">
                  {shops.slice(0, 6).map(shop => {
                    const ch = CHANNEL_LABELS[shop.channel] ?? { bg: '#64748b', short: shop.channel[0], label: shop.channel };
                    return (
                      <div key={shop.id} className="flex items-center justify-between p-2.5 bg-[#f8fafc] rounded-[9px]">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-[6px] flex items-center justify-center text-white text-[10px] font-bold" style={{ background: ch.bg === '#f1f5f9' ? '#64748b' : ch.bg }}>{ch.short}</span>
                          <span className="text-[12.5px] font-medium text-[#374151] truncate max-w-[200px]">{shop.name}</span>
                        </div>
                        <button onClick={() => deployToShop(shop.id)} disabled={deploying === shop.id}
                          className="flex items-center gap-1 px-2.5 h-7 rounded-[7px] text-[11.5px] font-semibold text-white hover:opacity-85 disabled:opacity-60 transition-opacity"
                          style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                          {deploying === shop.id ? <Loader2 size={10} className="animate-spin"/> : <Rocket size={10}/>}
                          Deploy
                        </button>
                      </div>
                    );
                  })}
                  {shops.length === 0 && <p className="text-[12px] text-[#94a3b8]">Chưa có shop nào đang hoạt động</p>}
                </div>
              </div>
            </>
          )}

          {tab === 'ai' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#eff6ff] rounded-[10px] text-[12px] text-[#1d4ed8]">
                <strong>AI tự động tối ưu</strong> tiêu đề, mô tả và phân tích SEO cho sản phẩm dựa trên thông tin hiện tại. Kết quả dùng model AI đã cấu hình.
              </div>
              {AI_ACTIONS.map(action => (
                <div key={action.id}>
                  <button onClick={() => runAi(action.id)} disabled={aiLoading}
                    className="w-full flex items-center justify-between p-3.5 bg-[#f8fafc] border border-[#e8edf5] rounded-[11px] hover:border-[#2563eb] hover:bg-[#eff6ff] transition-all disabled:opacity-60">
                    <div className="flex items-center gap-2.5">
                      <span className="text-[18px]">{action.icon}</span>
                      <span className="text-[13px] font-semibold text-[#0f172a]">{action.label}</span>
                    </div>
                    {aiLoading && aiAction === action.id ? <Loader2 size={14} className="animate-spin text-[#2563eb]"/> : <Zap size={14} className="text-[#94a3b8]"/>}
                  </button>

                  {aiAction === action.id && aiResult && (
                    <div className="mt-2 p-3 bg-[#f8fafc] border border-[#e8edf5] rounded-[10px]">
                      <p className="text-[12px] text-[#374151] whitespace-pre-wrap leading-relaxed">{aiResult}</p>
                      <div className="flex gap-2 mt-3">
                        {(action.id === 'title' || action.id === 'description') && (
                          <button onClick={() => applyAiResult(action.id)}
                            className="flex items-center gap-1.5 px-3 h-7 rounded-[7px] bg-[#2563eb] text-white text-[11.5px] font-semibold hover:opacity-85 transition-opacity">
                            <Check size={11}/>Áp dụng
                          </button>
                        )}
                        <button onClick={() => { navigator.clipboard.writeText(aiResult); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
                          className="flex items-center gap-1.5 px-3 h-7 rounded-[7px] border border-[#e8edf5] text-[11.5px] font-semibold text-[#64748b] hover:bg-white transition-colors">
                          {copied ? <><Check size={11}/>Đã copy</> : <><Copy size={11}/>Copy</>}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'seo' && (
            <div className="space-y-4">
              {/* Score circle */}
              <div className="flex items-center gap-4 p-4 bg-[#f8fafc] rounded-[12px]">
                <div className="relative w-16 h-16 flex-shrink-0">
                  <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f1f5f9" strokeWidth="3"/>
                    <circle cx="18" cy="18" r="15.9" fill="none"
                      stroke={product.seo_score >= 70 ? '#16a34a' : product.seo_score >= 40 ? '#ea580c' : '#dc2626'}
                      strokeWidth="3" strokeDasharray={`${product.seo_score} 100`} strokeLinecap="round"/>
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold text-[#0f172a]">{product.seo_score}</span>
                </div>
                <div>
                  <p className="text-[14px] font-bold text-[#0f172a]">
                    {product.seo_score >= 70 ? '🟢 SEO Tốt' : product.seo_score >= 40 ? '🟠 Cần cải thiện' : '🔴 SEO Kém'}
                  </p>
                  <p className="text-[12px] text-[#64748b] mt-0.5">
                    {product.seo_score >= 70 ? 'Sản phẩm được tối ưu tốt cho sàn TMĐT' : product.seo_score >= 40 ? 'Cải thiện tiêu đề và mô tả để tăng điểm' : 'Cần bổ sung mô tả và từ khoá ngay'}
                  </p>
                </div>
              </div>

              {/* Breakdown */}
              <div>
                <p className="text-[11px] font-bold text-[#94a3b8] uppercase tracking-wider mb-2">Chi tiết điểm</p>
                <SeoBreakdown name={form.name} description={form.description || ''} salePrice={form.sale_price}/>
              </div>

              {/* Quick tips */}
              <div className="p-3 bg-[#fff7ed] border border-[#fed7aa] rounded-[10px]">
                <p className="text-[11.5px] font-bold text-[#c2410c] mb-1.5">💡 Gợi ý tối ưu nhanh</p>
                <ul className="space-y-1 text-[11.5px] text-[#92400e]">
                  {form.name.length < 40 && <li>• Tên SP quá ngắn — thêm mô tả chất liệu, xuất xứ vào tiêu đề</li>}
                  {!(form.description?.trim()) && <li>• Chưa có mô tả — click tab AI để tạo tự động</li>}
                  {form.sale_price === 0 && <li>• Thêm giá sale để tăng điểm và thu hút mua hàng</li>}
                  {(form.description?.trim().length ?? 0) < 100 && (form.description?.trim().length ?? 0) > 0 && <li>• Mô tả quá ngắn — cần tối thiểu 100 ký tự</li>}
                  {product.seo_score >= 70 && <li>• SEO đã tối ưu tốt! Deploy lên sàn ngay.</li>}
                </ul>
              </div>

              <button onClick={() => setTab('ai')}
                className="w-full flex items-center justify-center gap-2 h-9 rounded-[9px] border border-[#e8edf5] text-[12.5px] font-semibold text-[#2563eb] hover:bg-[#eff6ff] transition-colors">
                <Bot size={13}/>Dùng AI tối ưu tự động
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {tab === 'edit' && (
          <div className="p-4 border-t border-[#f0f3f8] flex gap-2.5">
            <button onClick={onClose} className="flex-1 h-10 border border-[#e8edf5] rounded-[10px] text-[13px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Huỷ</button>
            <button onClick={handleSave} disabled={saving}
              className="flex-1 h-10 rounded-[10px] text-white text-[13px] font-semibold hover:opacity-85 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
              {saving ? <><Loader2 size={13} className="animate-spin"/>Đang lưu...</> : <><Check size={13}/>Lưu thay đổi</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const EMOJIS = ['👕','👖','🎧','🍶','🧴','👟','👗','🎒','💧','💡','🧥','💆','🍳','👠','💊','🔪','📱','🏀'];
const CHANNELS = ['tiktok','shopee','lazada','tiki','facebook','website'];

export default function ProductsPage() {
  const [data, setData]             = useState<{ products: Product[]; total: number; stats: Stats; categories: string[] } | null>(null);
  const [q, setQ]                   = useState('');
  const [category, setCategory]     = useState('');
  const [status, setStatus]         = useState('');
  const [channel, setChannel]       = useState('');
  const [stock, setStock]           = useState('');
  const [sort, setSort]             = useState('newest');
  const [page, setPage]             = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing]       = useState<Product | null>(null);
  const [showAdd, setShowAdd]       = useState(false);
  const [addForm, setAddForm]       = useState({ sku:'', name:'', category:'', price:'', cost_price:'', sale_price:'', stock:'', weight:'', description:'' });
  const [adding, setAdding]         = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ q, category, status, channel, stock, sort, page: String(page) });
    fetch('/api/products?' + p).then(r => r.json()).then(setData);
  }, [q, category, status, channel, stock, sort, page]);

  useEffect(() => { load(); }, [load]);

  // Debounce search
  const handleSearch = (v: string) => {
    setQ(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setPage(1), 300);
  };

  const handleAdd = async () => {
    setAdding(true);
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, price: Number(addForm.price), cost_price: Number(addForm.cost_price), sale_price: Number(addForm.sale_price), stock: Number(addForm.stock), weight: Number(addForm.weight) }),
    });
    setAdding(false);
    setShowAdd(false);
    setAddForm({ sku:'', name:'', category:'', price:'', cost_price:'', sale_price:'', stock:'', weight:'', description:'' });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    load();
  };

  const activeFilters = [category, status, channel, stock].filter(Boolean).length;

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const { products, total, stats, categories } = data;
  const totalPages = Math.ceil(total / 20);
  const avgSeo = products.length > 0 ? Math.round(products.reduce((s, p) => s + p.seo_score, 0) / products.length) : 0;

  return (
    <PageShell title="All Sản Phẩm" subtitle={`Quản lý ${stats.total} sản phẩm trong hệ thống`}
      action={
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity"
          style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
          <Plus size={15} strokeWidth={2.5}/> Thêm sản phẩm
        </button>
      }
    >

      {/* Stats header */}
      <div className="grid grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Tổng sản phẩm', value: stats.total, icon: <Package size={16}/>, color: '#2563eb', bg: '#eff6ff' },
          { label: 'Đang bán', value: stats.active, icon: <TrendingUp size={16}/>, color: '#16a34a', bg: '#f0fdf4' },
          { label: 'Sắp hết hàng', value: stats.low_stock, icon: <AlertTriangle size={16}/>, color: '#ea580c', bg: '#fff7ed' },
          { label: 'Hết hàng', value: stats.out_of_stock, icon: <XCircle size={16}/>, color: '#dc2626', bg: '#fef2f2' },
          { label: 'Điểm SEO TB', value: avgSeo, icon: <Star size={16}/>, color: '#7c3aed', bg: '#faf5ff', suffix: '/100' },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#e8edf5] rounded-[14px] p-4" style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="w-8 h-8 rounded-[8px] flex items-center justify-center" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            </div>
            <p className="text-[22px] font-extrabold text-[#0f172a] leading-none">{s.value}<span className="text-[13px] font-medium text-[#94a3b8]">{s.suffix ?? ''}</span></p>
            <p className="text-[11.5px] text-[#64748b] mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-[#e8edf5] rounded-[14px] p-3.5 mb-4" style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        <div className="flex gap-2.5 items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
            <input value={q} onChange={e => handleSearch(e.target.value)} placeholder="Tìm tên, SKU, mô tả..."
              className="w-full h-9 pl-9 pr-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"/>
          </div>
          <select value={sort} onChange={e => setSort(e.target.value)}
            className="h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[12.5px] text-[#374151] outline-none cursor-pointer">
            <option value="newest">Mới nhất</option>
            <option value="name">Tên A-Z</option>
            <option value="price_desc">Giá cao nhất</option>
            <option value="price_asc">Giá thấp nhất</option>
            <option value="stock_asc">Tồn kho thấp nhất</option>
            <option value="stock_desc">Tồn kho cao nhất</option>
          </select>
          <button onClick={() => setShowFilters(f => !f)}
            className={`flex items-center gap-1.5 h-9 px-3 rounded-[9px] border text-[12.5px] font-semibold transition-colors ${showFilters || activeFilters > 0 ? 'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]' : 'border-[#e8edf5] text-[#64748b] hover:bg-[#f6f8fc]'}`}>
            <Filter size={13}/>
            Bộ lọc {activeFilters > 0 && <span className="w-4 h-4 rounded-full bg-[#2563eb] text-white text-[10px] flex items-center justify-center">{activeFilters}</span>}
            <ChevronDown size={12} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`}/>
          </button>
          {activeFilters > 0 && (
            <button onClick={() => { setCategory(''); setStatus(''); setChannel(''); setStock(''); setPage(1); }}
              className="h-9 px-3 rounded-[9px] border border-[#e8edf5] text-[12.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors flex items-center gap-1.5">
              <X size={12}/>Xoá lọc
            </button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-4 gap-2.5 mt-2.5 pt-2.5 border-t border-[#f1f5f9]">
            <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }}
              className="h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[12.5px] text-[#374151] outline-none cursor-pointer">
              <option value="">Tất cả danh mục</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}
              className="h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[12.5px] text-[#374151] outline-none cursor-pointer">
              <option value="">Tất cả trạng thái</option>
              <option value="active">Đang bán</option>
              <option value="inactive">Ngừng bán</option>
            </select>
            <select value={channel} onChange={e => { setChannel(e.target.value); setPage(1); }}
              className="h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[12.5px] text-[#374151] outline-none cursor-pointer">
              <option value="">Tất cả kênh</option>
              {CHANNELS.map(c => <option key={c} value={c}>{CHANNEL_LABELS[c]?.label ?? c}</option>)}
            </select>
            <select value={stock} onChange={e => { setStock(e.target.value); setPage(1); }}
              className="h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[12.5px] text-[#374151] outline-none cursor-pointer">
              <option value="">Tất cả tồn kho</option>
              <option value="out">Hết hàng (0)</option>
              <option value="low">Sắp hết (&lt;50)</option>
              <option value="ok">Còn hàng (≥50)</option>
            </select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-[#e8edf5] rounded-[14px] overflow-hidden" style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
        <div className="px-4 py-3 border-b border-[#f0f3f8] flex items-center justify-between">
          <p className="text-[13px] font-semibold text-[#374151]">
            {total} sản phẩm {q || activeFilters > 0 ? '(đang lọc)' : ''}
          </p>
          <p className="text-[12px] text-[#94a3b8]">Trang {page}/{totalPages || 1}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f3f8] bg-[#fafbfd]">
                {['', 'SKU', 'Sản phẩm', 'Kênh', 'Giá nhập', 'Giá bán', 'Giá sale', 'Lợi nhuận', 'Tồn kho', 'Lượt xem', 'Đã bán', 'Điểm SEO', ''].map((h, i) => (
                  <th key={i} className="text-left text-[10.5px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={p.id} className="border-b border-[#f8fafc] hover:bg-[#fafbff] transition-colors group">
                  <td className="px-3 py-2.5">
                    <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] flex items-center justify-center text-[14px]">
                      {EMOJIS[idx % EMOJIS.length]}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[11px] text-[#94a3b8] font-mono whitespace-nowrap">{p.sku}</td>
                  <td className="px-3 py-2.5 max-w-[180px]">
                    <p className="text-[12.5px] font-semibold text-[#0f172a] truncate">{p.name}</p>
                    <p className="text-[11px] text-[#94a3b8] truncate">{p.category}</p>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1 flex-wrap">
                      {p.channels ? p.channels.split(',').filter(Boolean).slice(0, 2).map(ch => <ChannelBadge key={ch} channel={ch}/>) : null}
                      {(p.channels?.split(',').filter(Boolean).length ?? 0) > 2 && <span className="h-5 px-1.5 bg-[#f1f5f9] text-[#64748b] text-[9px] font-semibold rounded flex items-center">+{p.channels!.split(',').length - 2}</span>}
                      {!p.channels && <span className="text-[10.5px] text-[#94a3b8]">Chưa đăng</span>}
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#64748b] whitespace-nowrap">{p.cost_price.toLocaleString('vi-VN')}đ</td>
                  <td className="px-3 py-2.5 text-[12.5px] font-semibold text-[#0f172a] whitespace-nowrap">{p.price.toLocaleString('vi-VN')}đ</td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    {p.sale_price > 0
                      ? <span className="text-[12px] font-semibold text-[#dc2626]">{p.sale_price.toLocaleString('vi-VN')}đ</span>
                      : <span className="text-[11px] text-[#cbd5e1]">—</span>}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span className={`text-[12.5px] font-bold ${p.profit_margin >= 20 ? 'text-[#16a34a]' : p.profit_margin >= 0 ? 'text-[#ea580c]' : 'text-[#dc2626]'}`}>
                      {p.profit_margin}%
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[12.5px] font-bold ${p.stock === 0 ? 'text-[#dc2626]' : p.stock < 50 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`}>
                      {p.stock.toLocaleString('vi-VN')}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#64748b]">{p.total_views.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-[#374151]">{p.total_sales.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2.5">
                    <SeoBar score={p.seo_score}/>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditing(p)} title="Chỉnh sửa"
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#eff6ff] hover:text-[#2563eb] transition-colors">
                        <Edit size={12}/>
                      </button>
                      <button onClick={() => setEditing(p)} title="AI tối ưu"
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#faf5ff] hover:text-[#7c3aed] transition-colors">
                        <Bot size={12}/>
                      </button>
                      <button onClick={() => handleDelete(p.id)} title="Xóa"
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors">
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {products.length === 0 && (
                <tr><td colSpan={13} className="px-4 py-12 text-center text-[13px] text-[#94a3b8]">Không tìm thấy sản phẩm nào</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#f0f3f8] flex items-center justify-between">
            <p className="text-[12px] text-[#64748b]">Hiển thị {(page-1)*20+1}–{Math.min(page*20, total)} / {total}</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="h-8 px-3 rounded-[8px] border border-[#e8edf5] text-[12px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] disabled:opacity-40 transition-colors">Trước</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i+1 : page >= totalPages-2 ? totalPages-4+i : page-2+i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button key={pg} onClick={() => setPage(pg)}
                    className={`w-8 h-8 rounded-[8px] text-[12px] font-semibold transition-colors ${pg === page ? 'bg-[#2563eb] text-white' : 'border border-[#e8edf5] text-[#64748b] hover:bg-[#f6f8fc]'}`}>
                    {pg}
                  </button>
                );
              })}
              <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page === totalPages}
                className="h-8 px-3 rounded-[8px] border border-[#e8edf5] text-[12px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] disabled:opacity-40 transition-colors">Sau</button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Drawer */}
      {editing && (
        <ProductDrawer product={editing} onClose={() => setEditing(null)} onSaved={() => { load(); setEditing(null); }}/>
      )}

      {/* Add Product Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}>
          <div className="bg-white rounded-[20px] p-6 w-[520px] shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[17px] font-bold text-[#0f172a]">Thêm sản phẩm mới</h3>
              <button onClick={() => setShowAdd(false)} className="w-7 h-7 flex items-center justify-center rounded-[7px] hover:bg-[#f1f5f9] text-[#94a3b8]"><X size={15}/></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Mã SKU','sku','text'], ['Tên sản phẩm','name','text'],
                ['Danh mục','category','text'], ['Giá nhập','cost_price','number'],
                ['Giá bán','price','number'], ['Giá sale (0 = không có)','sale_price','number'],
                ['Tồn kho','stock','number'], ['Trọng lượng (kg)','weight','number'],
              ].map(([label, field, type]) => (
                <div key={field} className={field === 'name' ? 'col-span-2' : ''}>
                  <label className="block text-[12px] font-semibold text-[#64748b] mb-1">{label}</label>
                  <input type={type} value={addForm[field as keyof typeof addForm]}
                    onChange={e => setAddForm(f => ({ ...f, [field]: e.target.value }))}
                    className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb]"/>
                </div>
              ))}
              <div className="col-span-2">
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1">Mô tả</label>
                <textarea value={addForm.description} onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))} rows={2}
                  className="w-full px-3 py-2 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] resize-none"/>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 h-10 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc]">Huỷ</button>
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 h-10 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                {adding ? <><Loader2 size={13} className="animate-spin"/>Đang thêm...</> : 'Thêm sản phẩm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
