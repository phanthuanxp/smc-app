'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  Plus, Search, Filter, Trash2, Edit, X, Bot, Zap, ChevronDown,
  TrendingUp, Package, AlertTriangle, XCircle, Star, Rocket,
  Copy, Check, Loader2, Upload, ImageIcon, RefreshCw,
} from 'lucide-react';
import PageShell from '@/components/PageShell';
import { ChannelBadge, ChannelBadgeMd, CHANNEL_LABELS } from '@/components/ChannelBadge';

// ── Types ──────────────────────────────────────────────────────────────────
interface Product {
  id: number; sku: string; name: string; category: string; description: string;
  price: number; cost_price: number; sale_price: number; stock: number; weight: number;
  status: string; channels: string | null; listing_count: number; image_url: string;
  total_views: number; total_sales: number; seo_score: number; profit_margin: number;
}
interface Stats { total: number; active: number; out_of_stock: number; low_stock: number; }

// ── SEO helpers ────────────────────────────────────────────────────────────
function seoColor(score: number) {
  if (score >= 85) return '#16a34a';
  if (score >= 70) return '#4ade80';
  if (score >= 55) return '#84cc16';
  if (score >= 40) return '#ea580c';
  return '#dc2626';
}
function SeoBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1 min-w-[72px]">
      <span className="text-[12px] font-extrabold tabular-nums" style={{ color: seoColor(score) }}>{score}</span>
      <span className="text-[10px] font-semibold text-[#16a34a]">/100</span>
    </div>
  );
}

function calcSeo(name: string, description: string, salePrice: number) {
  let s = 0;
  const n = name.length, d = (description ?? '').trim();
  if (n >= 20) s += 18;
  if (n >= 40 && n <= 80) s += 30;
  if (d.length > 0) s += 25;
  if (d.length > 100) s += 15;
  if (['chính hãng','cao cấp','chất lượng','sale','hot','best','free ship'].some(k => (name + d).toLowerCase().includes(k))) s += 10;
  if (salePrice > 0) s += 10;
  return Math.min(s, 100);
}

// ── Image Upload Zone ──────────────────────────────────────────────────────
function ImageUploadZone({ url, onChange }: { url: string; onChange: (u: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true); setErr('');
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch('/api/products/upload', { method: 'POST', body: fd });
    const data = await res.json();
    setUploading(false);
    if (res.ok) onChange(data.url);
    else setErr(data.error ?? 'Upload thất bại');
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) upload(file);
  };

  return (
    <div className="space-y-2">
      <label className="text-[11.5px] font-semibold" style={{ color: 'var(--smc-text-3)' }}>Ảnh sản phẩm</label>
      <div
        className={`relative rounded-[12px] border-2 border-dashed transition-all cursor-pointer ${dragging ? 'border-[#2563eb] bg-[#eff6ff]' : 'border-[#e8edf5] hover:border-[#94a3b8]'}`}
        style={{ background: dragging ? undefined : 'var(--smc-surface-2)' }}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) upload(f); }}/>

        {url ? (
          <div className="flex items-center gap-3 p-3">
            <img src={url} alt="" className="w-16 h-16 rounded-[8px] object-cover flex-shrink-0 border border-[#e8edf5]"
              onError={e => { (e.target as HTMLImageElement).style.display='none'; }}/>
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold" style={{ color: 'var(--smc-text)' }}>Ảnh đã chọn</p>
              <p className="text-[10.5px] truncate" style={{ color: 'var(--smc-text-4)' }}>{url}</p>
              <button onClick={e => { e.stopPropagation(); onChange(''); }}
                className="mt-1 text-[10.5px] text-[#dc2626] hover:opacity-70">Xoá ảnh</button>
            </div>
            {uploading && <Loader2 size={16} className="animate-spin text-[#2563eb] flex-shrink-0"/>}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-5 gap-2">
            {uploading
              ? <Loader2 size={22} className="animate-spin text-[#2563eb]"/>
              : <Upload size={22} style={{ color: 'var(--smc-text-4)' }}/>}
            <p className="text-[12px] font-medium" style={{ color: 'var(--smc-text-3)' }}>
              {uploading ? 'Đang upload...' : 'Kéo thả hoặc click để chọn ảnh'}
            </p>
            <p className="text-[10.5px]" style={{ color: 'var(--smc-text-4)' }}>JPG, PNG, WEBP · Tối đa 5MB</p>
          </div>
        )}
      </div>

      {/* URL fallback */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex items-center gap-2 px-3 h-8 rounded-[8px] border text-[11.5px]"
          style={{ background: 'var(--smc-surface-2)', borderColor: 'var(--smc-border)', color: 'var(--smc-text-4)' }}>
          <ImageIcon size={11}/>
          <input value={url} onChange={e => onChange(e.target.value)}
            placeholder="Hoặc dán URL ảnh..."
            className="flex-1 bg-transparent outline-none text-[11.5px]"
            style={{ color: 'var(--smc-text)' }}
            onClick={e => e.stopPropagation()}/>
        </div>
      </div>
      {err && <p className="text-[11px] text-[#dc2626]">{err}</p>}
    </div>
  );
}

// ── Live SEO Panel ─────────────────────────────────────────────────────────
function LiveSeoPanel({ name, description, salePrice }: { name: string; description: string; salePrice: number }) {
  const score = calcSeo(name, description, salePrice);
  const color = seoColor(score);
  const n = name.length, d = (description ?? '').trim();

  const items = [
    { label: 'Tên 20+ ký tự', ok: n >= 20, pts: 18, hint: `${n} ký tự` },
    { label: 'Tên 40-80 ký tự (tối ưu)', ok: n >= 40 && n <= 80, pts: 30, hint: `${n} ký tự` },
    { label: 'Có mô tả sản phẩm', ok: d.length > 0, pts: 25, hint: '' },
    { label: 'Mô tả trên 100 ký tự', ok: d.length > 100, pts: 15, hint: `${d.length} ký tự` },
    { label: 'Từ khoá bán hàng', ok: ['chính hãng','cao cấp','chất lượng','sale','hot','best','free ship'].some(k=>(name+d).toLowerCase().includes(k)), pts: 10, hint: '' },
    { label: 'Có giá khuyến mãi', ok: salePrice > 0, pts: 10, hint: '' },
  ];

  const radius = 30;
  const circ = 2 * Math.PI * radius;
  const dash = (score / 100) * circ;

  return (
    <div className="rounded-[14px] p-4 space-y-4" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
      {/* Circle gauge */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 72 72" className="w-16 h-16 -rotate-90">
            <circle cx="36" cy="36" r={radius} fill="none" stroke="var(--smc-border)" strokeWidth="5"/>
            <circle cx="36" cy="36" r={radius} fill="none"
              stroke={color} strokeWidth="5"
              strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.4s ease, stroke 0.4s ease' }}/>
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[15px] font-extrabold" style={{ color }}>{score}</span>
        </div>
        <div>
          <p className="text-[13px] font-bold" style={{ color: 'var(--smc-text)' }}>
            {score >= 70 ? '🟢 SEO Tốt' : score >= 40 ? '🟠 Cần cải thiện' : '🔴 SEO Kém'}
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--smc-text-3)' }}>
            {score >= 70 ? 'Tối ưu tốt cho sàn TMĐT' : 'Chỉnh sửa bên trái để tăng điểm'}
          </p>
        </div>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center justify-between text-[11.5px]">
            <span className="flex items-center gap-1.5" style={{ color: it.ok ? 'var(--smc-text-2)' : 'var(--smc-text-4)' }}>
              <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white flex-shrink-0 ${it.ok ? 'bg-[#16a34a]' : 'bg-[#e2e8f0]'}`}>
                {it.ok ? '✓' : '–'}
              </span>
              {it.label}{it.hint ? ` · ${it.hint}` : ''}
            </span>
            <span className={`font-bold text-[11px] ${it.ok ? 'text-[#16a34a]' : 'text-[#e2e8f0]'}`}>+{it.pts}</span>
          </div>
        ))}
      </div>

      {/* Quick tip */}
      {score < 100 && (
        <div className="px-3 py-2 rounded-[9px] text-[11px]" style={{ background: '#fff7ed', color: '#92400e', border: '1px solid #fed7aa' }}>
          💡 {n < 40 ? 'Tên SP quá ngắn — thêm chất liệu, xuất xứ, tính năng' :
               d.length === 0 ? 'Chưa có mô tả — dùng AI viết ngay bên dưới' :
               d.length <= 100 ? 'Mô tả quá ngắn — cần tối thiểu 100 ký tự' :
               salePrice === 0 ? 'Thêm giá sale để tăng 10 điểm và thu hút mua hàng' :
               'Thêm từ khoá như "chính hãng", "cao cấp" vào tiêu đề'}
        </div>
      )}
    </div>
  );
}

// ── Profit Calculator Panel ────────────────────────────────────────────────
function ProfitPanel({
  price, costPrice, salePrice,
  platformFee, vat, shipping,
  onFeeChange,
}: {
  price: number; costPrice: number; salePrice: number;
  platformFee: number; vat: number; shipping: number;
  onFeeChange: (f: { platformFee?: number; vat?: number; shipping?: number }) => void;
}) {
  const basePrice = salePrice > 0 ? salePrice : price;
  const platformFeeAmt = Math.round(basePrice * platformFee / 100);
  const vatAmt = Math.round(basePrice * vat / 100);
  const profit = basePrice - costPrice - platformFeeAmt - vatAmt - shipping;
  const profitPct = basePrice > 0 ? Math.round((profit / basePrice) * 100) : 0;
  const profitColor = profit >= 0 && profitPct >= 20 ? '#16a34a' : profit >= 0 ? '#ea580c' : '#dc2626';

  const Row = ({ label, amt, sub, editable, value, onChange, suffix = '' }: {
    label: string; amt: number; sub?: string;
    editable?: boolean; value?: number; onChange?: (v: number) => void; suffix?: string;
  }) => (
    <div className="flex items-center justify-between text-[12px] py-1.5">
      <span style={{ color: 'var(--smc-text-3)' }} className="flex items-center gap-1.5">
        {label}
        {editable && (
          <span className="flex items-center gap-0.5">
            (<input type="number" min={0} max={100} value={value} onChange={e => onChange?.(Number(e.target.value))}
              className="w-9 h-5 px-1 text-center text-[11px] rounded-[5px] border outline-none"
              style={{ background: 'var(--smc-surface)', borderColor: 'var(--smc-border)', color: 'var(--smc-text)' }}/>
            {suffix})
          </span>
        )}
        {sub && <span className="text-[10.5px]" style={{ color: 'var(--smc-text-4)' }}>{sub}</span>}
      </span>
      <span className="font-semibold" style={{ color: 'var(--smc-text-2)' }}>
        {amt >= 0 ? '' : ''}{Math.abs(amt).toLocaleString('vi-VN')}đ
      </span>
    </div>
  );

  return (
    <div className="rounded-[14px] p-4" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--smc-text-4)' }}>
        Chi phí & Lợi nhuận thực
      </p>

      <div className="divide-y" style={{ borderColor: 'var(--smc-border)' }}>
        <div className="flex items-center justify-between text-[12px] pb-1.5">
          <span className="font-semibold" style={{ color: 'var(--smc-text)' }}>
            {salePrice > 0 ? 'Giá sale' : 'Giá bán'}
          </span>
          <span className="font-bold" style={{ color: 'var(--smc-text)' }}>{basePrice.toLocaleString('vi-VN')}đ</span>
        </div>

        <div className="py-1">
          <Row label="– Giá nhập" amt={costPrice}/>
          <Row label="– Phí sàn" amt={platformFeeAmt} editable value={platformFee} onChange={v => onFeeChange({ platformFee: v })} suffix="%"/>
          <Row label="– Thuế VAT" amt={vatAmt} editable value={vat} onChange={v => onFeeChange({ vat: v })} suffix="%"/>
          <Row label="– Phí vận chuyển" amt={shipping} editable value={shipping} onChange={v => onFeeChange({ shipping: v })} suffix="đ"/>
        </div>

        <div className="pt-2">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-bold" style={{ color: 'var(--smc-text)' }}>= Lợi nhuận thực</span>
            <div className="text-right">
              <span className="text-[15px] font-extrabold" style={{ color: profitColor }}>{profit.toLocaleString('vi-VN')}đ</span>
              <span className="text-[11px] font-semibold ml-1.5 px-1.5 py-0.5 rounded-full" style={{ background: `${profitColor}18`, color: profitColor }}>{profitPct}%</span>
            </div>
          </div>
          <p className="text-[10.5px] mt-1" style={{ color: 'var(--smc-text-4)' }}>
            Sau khi trừ: nhập + phí sàn + VAT + ship
          </p>
        </div>
      </div>
    </div>
  );
}

// ── AI Panel ───────────────────────────────────────────────────────────────
function AiPanel({ form, onApply }: {
  form: { name: string; category: string; description: string; price: number };
  onApply: (field: 'name' | 'description', value: string) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState('');

  const run = async (action: string) => {
    setLoading(action);
    const input = `Tên: ${form.name}\nDanh mục: ${form.category}\nMô tả: ${form.description || 'Chưa có'}\nGiá: ${form.price.toLocaleString('vi-VN')}đ`;
    const res = await fetch('/api/ai', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, input }),
    });
    const data = await res.json();
    setLoading(null);
    setResults(r => ({ ...r, [action]: data.result ?? data.error ?? 'Lỗi không xác định' }));
  };

  const copyText = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(''), 1500);
  };

  const actions = [
    { id: 'title', label: 'Tối ưu tiêu đề', icon: '✏️', field: 'name' as const },
    { id: 'description', label: 'Viết mô tả', icon: '📝', field: 'description' as const },
    { id: 'seo', label: 'Phân tích SEO', icon: '🔍', field: null },
  ];

  return (
    <div className="rounded-[14px] p-4 space-y-2.5" style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)' }}>
      <p className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--smc-text-4)' }}>AI Tối ưu</p>
      {actions.map(a => (
        <div key={a.id}>
          <button onClick={() => run(a.id)} disabled={!!loading}
            className="w-full flex items-center justify-between px-3 py-2.5 rounded-[10px] border transition-all disabled:opacity-60"
            style={{ background: 'var(--smc-surface)', borderColor: 'var(--smc-border)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = '#2563eb'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--smc-border)'; }}
          >
            <span className="flex items-center gap-2 text-[12.5px] font-semibold" style={{ color: 'var(--smc-text)' }}>
              <span>{a.icon}</span> {a.label}
            </span>
            {loading === a.id
              ? <Loader2 size={13} className="animate-spin text-[#2563eb]"/>
              : <Zap size={13} style={{ color: 'var(--smc-text-4)' }}/>}
          </button>

          {results[a.id] && (
            <div className="mt-1.5 p-3 rounded-[9px] text-[12px] leading-relaxed whitespace-pre-wrap"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text-2)' }}>
              {results[a.id]}
              <div className="flex gap-2 mt-2.5">
                {a.field && (
                  <button onClick={() => {
                    const val = a.field === 'name' ? results[a.id].split('\n')[0].slice(0, 120) : results[a.id];
                    onApply(a.field, val);
                  }}
                    className="flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-white text-[11.5px] font-semibold hover:opacity-85"
                    style={{ background: '#2563eb' }}>
                    <Check size={10}/> Áp dụng ngay
                  </button>
                )}
                <button onClick={() => copyText(a.id, results[a.id])}
                  className="flex items-center gap-1.5 px-2.5 h-7 rounded-[7px] text-[11.5px] font-semibold border transition-colors"
                  style={{ borderColor: 'var(--smc-border)', color: 'var(--smc-text-3)' }}>
                  {copied === a.id ? <><Check size={10}/>Đã copy</> : <><Copy size={10}/>Copy</>}
                </button>
                <button onClick={() => setResults(r => { const n = { ...r }; delete n[a.id]; return n; })}
                  className="ml-auto p-1.5 rounded-[6px] hover:opacity-70 transition-opacity"
                  style={{ color: 'var(--smc-text-4)' }}>
                  <X size={12}/>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Product Drawer (Unified) ───────────────────────────────────────────────
function ProductDrawer({ product, onClose, onSaved }: {
  product: Product; onClose: () => void; onSaved: () => void;
}) {
  const [form, setForm]     = useState({ ...product });
  const [saving, setSaving] = useState(false);
  const [shops, setShops]   = useState<{ id: number; name: string; channel: string }[]>([]);
  const [deploying, setDeploying] = useState<number | null>(null);
  const [fees, setFees]     = useState({ platformFee: 5, vat: 10, shipping: 0 });

  useEffect(() => {
    fetch('/api/shops').then(r => r.json()).then(d =>
      setShops((d.shops ?? []).filter((s: { status: string }) => s.status === 'active'))
    );
  }, []);

  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const handleSave = async () => {
    setSaving(true);
    await fetch(`/api/products/${product.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false); onSaved();
  };

  const deployToShop = async (shopId: number) => {
    setDeploying(shopId);
    await fetch('/api/channels/publish', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId, productId: product.id }),
    });
    setDeploying(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="flex-1 bg-black/30" onClick={onClose}/>
      <div className="w-1/2 min-w-[820px] h-full shadow-2xl flex flex-col overflow-hidden" style={{ background: 'var(--smc-surface)' }}>

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid var(--smc-border)' }}>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-bold truncate" style={{ color: 'var(--smc-text)' }}>{form.name || product.name}</p>
            <p className="text-[11.5px] mt-0.5" style={{ color: 'var(--smc-text-4)' }}>{product.sku} · {product.category}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-1.5 px-4 h-9 rounded-[9px] text-white text-[13px] font-semibold hover:opacity-85 disabled:opacity-60 transition-opacity"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
              {saving ? <Loader2 size={13} className="animate-spin"/> : <Check size={13}/>}
              {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-[8px] transition-colors hover:opacity-70" style={{ background: 'var(--smc-surface-2)' }}>
              <X size={15} style={{ color: 'var(--smc-text-3)' }}/>
            </button>
          </div>
        </div>

        {/* Body — 2 columns */}
        <div className="flex-1 overflow-hidden flex">

          {/* LEFT — Edit fields */}
          <div className="w-[55%] flex-shrink-0 overflow-y-auto px-6 py-5 space-y-5" style={{ borderRight: '1px solid var(--smc-border)' }}>

            {/* Image upload */}
            <ImageUploadZone url={form.image_url || ''} onChange={u => set({ image_url: u })}/>

            {/* Name */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-semibold" style={{ color: 'var(--smc-text-3)' }}>Tên sản phẩm</label>
                <span className="text-[10.5px]" style={{ color: form.name.length >= 40 && form.name.length <= 80 ? '#16a34a' : 'var(--smc-text-4)' }}>
                  {form.name.length}/120 · {form.name.length >= 40 && form.name.length <= 80 ? '✓ Tối ưu' : 'Tối ưu: 40-80'}
                </span>
              </div>
              <textarea value={form.name} onChange={e => set({ name: e.target.value })} rows={2}
                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none resize-none transition-colors"
                style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11.5px] font-semibold" style={{ color: 'var(--smc-text-3)' }}>Mô tả sản phẩm</label>
                <span className="text-[10.5px]" style={{ color: (form.description || '').length > 100 ? '#16a34a' : 'var(--smc-text-4)' }}>
                  {(form.description || '').length} ký tự · {(form.description || '').length > 100 ? '✓ Tốt' : 'Cần 100+'}
                </span>
              </div>
              <textarea value={form.description || ''} onChange={e => set({ description: e.target.value })} rows={5}
                placeholder="Mô tả chi tiết sản phẩm: chất liệu, kích thước, xuất xứ, công dụng..."
                className="w-full px-3 py-2.5 rounded-[10px] text-[13px] outline-none resize-none transition-colors"
                style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
            </div>

            {/* SKU + Category */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Mã SKU', key: 'sku' as const },
                { label: 'Danh mục', key: 'category' as const },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--smc-text-3)' }}>{label}</label>
                  <input value={(form[key] as string) || ''} onChange={e => set({ [key]: e.target.value })}
                    className="w-full h-9 px-3 rounded-[9px] text-[13px] outline-none transition-colors"
                    style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--smc-text-4)' }}>Giá & Chi phí</p>
              <div className="grid grid-cols-3 gap-2.5 mb-3">
                {[
                  { label: 'Giá nhập', key: 'cost_price', color: 'var(--smc-text-3)' },
                  { label: 'Giá bán', key: 'price', color: 'var(--smc-text)' },
                  { label: 'Giá sale', key: 'sale_price', color: '#dc2626' },
                ].map(({ label, key, color }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-semibold mb-1.5" style={{ color: 'var(--smc-text-3)' }}>{label}</label>
                    <input type="number" value={form[key as keyof typeof form] as number}
                      onChange={e => set({ [key]: Number(e.target.value) })}
                      className="w-full h-9 px-2.5 rounded-[9px] text-[12.5px] font-semibold outline-none transition-colors"
                      style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', color }}/>
                  </div>
                ))}
              </div>
            </div>

            {/* Stock + Status + Weight */}
            <div className="grid grid-cols-3 gap-2.5">
              {[
                { label: 'Tồn kho', key: 'stock', type: 'number' },
                { label: 'Trọng lượng (kg)', key: 'weight', type: 'number' },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--smc-text-3)' }}>{label}</label>
                  <input type={type} value={form[key as keyof typeof form] as number}
                    onChange={e => set({ [key]: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-[9px] text-[13px] outline-none transition-colors"
                    style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}/>
                </div>
              ))}
              <div>
                <label className="block text-[11.5px] font-semibold mb-1.5" style={{ color: 'var(--smc-text-3)' }}>Trạng thái</label>
                <select value={form.status} onChange={e => set({ status: e.target.value })}
                  className="w-full h-9 px-3 rounded-[9px] text-[13px] outline-none transition-colors cursor-pointer"
                  style={{ background: 'var(--smc-surface-2)', border: '1px solid var(--smc-border)', color: 'var(--smc-text)' }}>
                  <option value="active">Đang bán</option>
                  <option value="inactive">Ngừng bán</option>
                </select>
              </div>
            </div>

            {/* Deploy to channels */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'var(--smc-text-4)' }}>Deploy lên sàn</p>
              <div className="space-y-1.5">
                {shops.slice(0, 5).map(shop => (
                  <div key={shop.id} className="flex items-center justify-between p-2.5 rounded-[9px]" style={{ background: 'var(--smc-surface-2)' }}>
                    <div className="flex items-center gap-2">
                      <ChannelBadgeMd channel={shop.channel}/>
                      <span className="text-[12.5px] font-medium truncate max-w-[180px]" style={{ color: 'var(--smc-text-2)' }}>{shop.name}</span>
                    </div>
                    <button onClick={() => deployToShop(shop.id)} disabled={deploying === shop.id}
                      className="flex items-center gap-1 px-2.5 h-7 rounded-[7px] text-[11.5px] font-semibold text-white hover:opacity-85 disabled:opacity-60 transition-opacity"
                      style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                      {deploying === shop.id ? <Loader2 size={10} className="animate-spin"/> : <Rocket size={10}/>}
                      Deploy
                    </button>
                  </div>
                ))}
                {shops.length === 0 && <p className="text-[12px]" style={{ color: 'var(--smc-text-4)' }}>Chưa có shop đang hoạt động</p>}
              </div>
            </div>
          </div>

          {/* RIGHT — Live SEO + AI + Profit */}
          <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">

            {/* Live SEO — updates as user types */}
            <LiveSeoPanel name={form.name} description={form.description || ''} salePrice={form.sale_price}/>

            {/* AI Panel */}
            <AiPanel
              form={{ name: form.name, category: form.category, description: form.description || '', price: form.price }}
              onApply={(field, value) => set({ [field]: value })}
            />

            {/* Profit Calculator */}
            <ProfitPanel
              price={form.price} costPrice={form.cost_price} salePrice={form.sale_price}
              platformFee={fees.platformFee} vat={fees.vat} shipping={fees.shipping}
              onFeeChange={patch => setFees(f => ({ ...f, ...patch }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────
const EMOJIS = ['👕','👖','🎧','🍶','🧴','👟','👗','🎒','💧','💡','🧥','💆','🍳','👠','💊','🔪','📱','🏀'];
const CHANNELS = ['tiktok','shopee','lazada','tiki','facebook','website'];

export default function ProductsPage() {
  const [data, setData]   = useState<{ products: Product[]; total: number; stats: Stats; categories: string[] } | null>(null);
  const [q, setQ]         = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus]     = useState('');
  const [channel, setChannel]   = useState('');
  const [stock, setStock]       = useState('');
  const [sort, setSort]         = useState('newest');
  const [page, setPage]         = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [editing, setEditing]   = useState<Product | null>(null);
  const [showAdd, setShowAdd]   = useState(false);
  const [addForm, setAddForm]   = useState({ sku:'', name:'', category:'', price:'', cost_price:'', sale_price:'', stock:'', weight:'', description:'' });
  const [adding, setAdding]     = useState(false);
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(() => {
    const p = new URLSearchParams({ q, category, status, channel, stock, sort, page: String(page) });
    fetch('/api/products?' + p).then(r => r.json()).then(setData);
  }, [q, category, status, channel, stock, sort, page]);

  useEffect(() => { load(); }, [load]);

  const handleSearch = (v: string) => {
    setQ(v);
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => setPage(1), 300);
  };

  const handleAdd = async () => {
    setAdding(true);
    await fetch('/api/products', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...addForm, price: Number(addForm.price), cost_price: Number(addForm.cost_price), sale_price: Number(addForm.sale_price), stock: Number(addForm.stock), weight: Number(addForm.weight) }),
    });
    setAdding(false); setShowAdd(false);
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
      {/* Stats */}
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
              className="w-full h-9 pl-9 pr-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] transition-colors"/>
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
          <p className="text-[13px] font-semibold text-[#374151]">{total} sản phẩm {q || activeFilters > 0 ? '(đang lọc)' : ''}</p>
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
                <tr key={p.id} className="border-b border-[#f8fafc] hover:bg-[#fafbff] transition-colors">
                  <td className="px-3 py-2.5">
                    <div className="w-8 h-8 rounded-[8px] overflow-hidden flex-shrink-0 bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] flex items-center justify-center text-[14px]">
                      {p.image_url
                        ? <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; (e.target as HTMLImageElement).parentElement!.textContent = EMOJIS[idx % EMOJIS.length]; }}/>
                        : EMOJIS[idx % EMOJIS.length]}
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
                    {p.sale_price > 0 ? <span className="text-[12px] font-semibold text-[#dc2626]">{p.sale_price.toLocaleString('vi-VN')}đ</span> : <span className="text-[11px] text-[#cbd5e1]">—</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[12.5px] font-bold ${p.profit_margin >= 20 ? 'text-[#16a34a]' : p.profit_margin >= 0 ? 'text-[#ea580c]' : 'text-[#dc2626]'}`}>{p.profit_margin}%</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[12.5px] font-bold ${p.stock === 0 ? 'text-[#dc2626]' : p.stock < 50 ? 'text-[#ea580c]' : 'text-[#16a34a]'}`}>{p.stock.toLocaleString('vi-VN')}</span>
                  </td>
                  <td className="px-3 py-2.5 text-[12px] text-[#64748b]">{p.total_views.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2.5 text-[12px] font-medium text-[#374151]">{p.total_sales.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-2.5"><SeoBar score={p.seo_score}/></td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditing(p)} title="Chỉnh sửa"
                        className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#eff6ff] hover:text-[#2563eb] transition-colors">
                        <Edit size={12}/>
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
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-[#f0f3f8] flex items-center justify-between">
            <p className="text-[12px] text-[#64748b]">Hiển thị {(page-1)*20+1}–{Math.min(page*20, total)} / {total}</p>
            <div className="flex gap-1.5">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="h-8 px-3 rounded-[8px] border border-[#e8edf5] text-[12px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] disabled:opacity-40">Trước</button>
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
                className="h-8 px-3 rounded-[8px] border border-[#e8edf5] text-[12px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] disabled:opacity-40">Sau</button>
            </div>
          </div>
        )}
      </div>

      {editing && <ProductDrawer product={editing} onClose={() => setEditing(null)} onSaved={() => { load(); setEditing(null); }}/>}

      {/* Add modal */}
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
