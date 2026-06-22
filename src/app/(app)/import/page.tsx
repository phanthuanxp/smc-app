'use client';
import { useState } from 'react';
import { Link2, Upload, FileText, CheckCircle, Clock } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import PageShell from '@/components/PageShell';

const HISTORY = [
  { url:'shopee.vn/product/abc', name:'Áo thun oversize form rộng', status:'completed', time:'10 phút trước' },
  { url:'tiktok.com/shop/item/123', name:'Tai nghe gaming RGB', status:'completed', time:'32 phút trước' },
  { url:'lazada.vn/products/xyz', name:'Bình nước thể thao 750ml', status:'processing', time:'1 giờ trước' },
  { url:'tiki.vn/p/sneaker-nam', name:'Giày sneaker cổ cao nam', status:'completed', time:'2 giờ trước' },
];

export default function ImportPage() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [imported, setImported] = useState<string|null>(null);

  const handleImport = async () => {
    if (!url.trim()) return;
    setLoading(true);
    await new Promise(r=>setTimeout(r,1800));
    setImported(url);
    setUrl('');
    setLoading(false);
  };

  return (
    <PageShell title="Import sản phẩm" subtitle="Import sản phẩm từ link URL hoặc file Excel">
      <div className="grid gap-5" style={{gridTemplateColumns:'1fr 380px'}}>
        {/* Import form */}
        <div className="space-y-4">
          {/* URL import */}
          <Card padding="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#fff7ed] flex items-center justify-center"><Link2 size={17} className="text-[#d97706]"/></div>
              <div>
                <h3 className="text-[15px] font-bold text-[#0f172a]">Import từ đường dẫn URL</h3>
                <p className="text-[12px] text-[#64748b]">Hỗ trợ TikTok Shop, Shopee, Lazada, Tiki, Facebook Shop</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Link2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
                <input
                  value={url} onChange={e=>setUrl(e.target.value)}
                  placeholder="https://shopee.vn/product/... hoặc dán link sản phẩm bất kỳ"
                  className="w-full h-11 pl-9 pr-4 bg-[#f6f8fc] border border-[#e8edf5] rounded-[11px] text-[13.5px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
                  onKeyDown={e=>e.key==='Enter'&&handleImport()}
                />
              </div>
              <button onClick={handleImport} disabled={loading||!url.trim()}
                className="h-11 px-5 rounded-[11px] text-white text-[13.5px] font-semibold hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity flex items-center gap-2"
                style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Đang nhập...</> : 'Import ngay'}
              </button>
            </div>
            {imported && (
              <div className="mt-3 p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] flex items-center gap-2">
                <CheckCircle size={15} className="text-[#16a34a] flex-shrink-0"/>
                <span className="text-[13px] text-[#16a34a] font-medium">Đã import thành công từ: {imported}</span>
              </div>
            )}
          </Card>

          {/* File import */}
          <Card padding="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-[10px] bg-[#eff6ff] flex items-center justify-center"><Upload size={17} className="text-[#2563eb]"/></div>
              <div>
                <h3 className="text-[15px] font-bold text-[#0f172a]">Import từ file Excel/CSV</h3>
                <p className="text-[12px] text-[#64748b]">Tải lên file danh sách sản phẩm theo mẫu chuẩn</p>
              </div>
            </div>
            <div
              className="border-2 border-dashed border-[#c7d2fe] rounded-[14px] p-10 text-center hover:border-[#2563eb] hover:bg-[#eff6ff] transition-all cursor-pointer"
              onDragOver={e=>e.preventDefault()}
            >
              <Upload size={32} className="text-[#a5b4fc] mx-auto mb-3"/>
              <p className="text-[14px] font-semibold text-[#374151] mb-1">Kéo thả file vào đây</p>
              <p className="text-[12.5px] text-[#94a3b8]">Hỗ trợ .xlsx, .csv — Tối đa 10MB</p>
              <button className="mt-3 px-4 py-2 bg-white border border-[#c7d2fe] rounded-[9px] text-[13px] font-semibold text-[#4f46e5] hover:bg-[#eff6ff] transition-colors">
                Chọn file
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2">
              <FileText size={13} className="text-[#94a3b8]"/>
              <a href="#" className="text-[12.5px] text-[#2563eb] font-semibold hover:opacity-70 transition-opacity">Tải xuống file mẫu Excel →</a>
            </div>
          </Card>
        </div>

        {/* History */}
        <Card padding="p-5">
          <SectionHeader title="Lịch sử import gần đây" />
          <div className="space-y-2">
            {HISTORY.map((h,i)=>(
              <div key={i} className="p-3 rounded-[12px] bg-[#f8fafc] border border-[#f0f3f8]">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-[13px] font-semibold text-[#0f172a] flex-1 leading-snug">{h.name}</p>
                  {h.status==='completed'
                    ? <span className="flex items-center gap-1 text-[11px] font-semibold text-[#16a34a] whitespace-nowrap"><CheckCircle size={12}/> Hoàn tất</span>
                    : <span className="flex items-center gap-1 text-[11px] font-semibold text-[#ea580c] whitespace-nowrap"><Clock size={12}/> Đang xử lý</span>
                  }
                </div>
                <p className="text-[11px] text-[#94a3b8] truncate">{h.url}</p>
                <p className="text-[11px] text-[#94a3b8] mt-0.5">{h.time}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </PageShell>
  );
}
