'use client';
import { useState } from 'react';
import { Sparkles, FileEdit, FileText, Search, Image, Video, Share2, ChevronRight, Zap, CheckCircle } from 'lucide-react';
import Card from '@/components/Card';
import PageShell from '@/components/PageShell';

const AI_TOOLS = [
  { icon:FileEdit, bg:'#eff6ff', color:'#2563eb', label:'AI viết tiêu đề', desc:'Tự động tạo tiêu đề hấp dẫn, tối ưu cho từng sàn', tag:'Phổ biến', action:'title' },
  { icon:FileText, bg:'#f0fdf4', color:'#16a34a', label:'AI viết mô tả',   desc:'Mô tả chi tiết sản phẩm theo chuẩn SEO của từng kênh', tag:'', action:'description' },
  { icon:Search,   bg:'#fef2f2', color:'#dc2626', label:'AI tối ưu SEO',   desc:'Phân tích từ khóa và tối ưu listing để tăng hiển thị', tag:'Mới', action:'seo' },
  { icon:Image,    bg:'#f5f3ff', color:'#7c3aed', label:'Tạo ảnh sản phẩm',desc:'AI mô tả concept ảnh sản phẩm chuyên nghiệp', tag:'Beta', action:'image' },
  { icon:Video,    bg:'#fdf2f8', color:'#c026d3', label:'Tạo video KOL',   desc:'AI viết kịch bản video TikTok/Reels giới thiệu sản phẩm', tag:'Beta', action:'video' },
  { icon:Share2,   bg:'#f0fdf4', color:'#16a34a', label:'Đăng đa kênh',    desc:'Tối ưu nội dung cho từng sàn khi đăng đồng loạt', tag:'', action:'multichannel' },
];

const TAG_COLOR: Record<string,{bg:string;color:string}> = {
  'Phổ biến': { bg:'#dcfce7', color:'#16a34a' },
  'Mới':      { bg:'#eff6ff', color:'#2563eb' },
  'Beta':     { bg:'#f5f3ff', color:'#7c3aed' },
};

export default function AIProductsPage() {
  const [active, setActive] = useState<number|null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRun = async () => {
    if (active === null || !input.trim()) return;
    setLoading(true);
    setResult('');
    setError('');
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: AI_TOOLS[active].action, input }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data.result);
      } else {
        setError(data.error ?? 'Không tạo được nội dung. Vui lòng thử lại.');
      }
    } catch {
      setError('Lỗi kết nối tới máy chủ AI.');
    }
    setLoading(false);
  };

  return (
    <PageShell title="AI tạo sản phẩm" subtitle="Sử dụng AI để tạo nội dung, tối ưu và đăng sản phẩm tự động">
      <div className="grid gap-5" style={{gridTemplateColumns:'280px 1fr'}}>
        {/* Tool list */}
        <div className="space-y-2">
          {AI_TOOLS.map((t,i)=>{
            const Icon=t.icon;
            const tagCfg = t.tag ? TAG_COLOR[t.tag] : null;
            return (
              <button key={i} onClick={()=>{setActive(i);setResult('');setError('');}}
                className={`w-full flex items-center gap-3 p-3.5 rounded-[14px] text-left transition-all border ${active===i?'border-[#2563eb] bg-[#eff6ff] shadow-sm':'border-[#e8edf5] bg-white hover:border-[#c7d2fe] hover:bg-[#f8faff]'}`}>
                <div className="w-9 h-9 rounded-[9px] flex items-center justify-center flex-shrink-0" style={{background:t.bg}}>
                  <Icon size={16} style={{color:t.color}}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[13px] font-semibold ${active===i?'text-[#2563eb]':'text-[#0f172a]'}`}>{t.label}</span>
                    {tagCfg && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{background:tagCfg.bg,color:tagCfg.color}}>{t.tag}</span>}
                  </div>
                  <p className="text-[11.5px] text-[#94a3b8] mt-0.5 leading-snug line-clamp-1">{t.desc}</p>
                </div>
                <ChevronRight size={14} className={active===i?'text-[#2563eb]':'text-[#cbd5e1]'}/>
              </button>
            );
          })}
        </div>

        {/* Workspace */}
        <div className="space-y-4">
          {active === null ? (
            <Card padding="p-10" className="flex flex-col items-center justify-center text-center min-h-[400px]">
              <div className="w-16 h-16 rounded-[20px] flex items-center justify-center mb-4" style={{background:'linear-gradient(135deg,#eff6ff,#f5f3ff)'}}>
                <Sparkles size={28} className="text-[#7c3aed]"/>
              </div>
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-2">Chọn công cụ AI để bắt đầu</h3>
              <p className="text-[13.5px] text-[#64748b] max-w-sm">Chọn một công cụ từ danh sách bên trái để sử dụng AI tạo nội dung cho sản phẩm của bạn</p>
            </Card>
          ) : (
            <Card padding="p-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-[10px] flex items-center justify-center" style={{background:AI_TOOLS[active].bg}}>
                  {(() => { const Icon = AI_TOOLS[active].icon; return <Icon size={16} style={{color:AI_TOOLS[active].color}}/>; })()}
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-[#0f172a]">{AI_TOOLS[active].label}</h3>
                  <p className="text-[12px] text-[#64748b]">{AI_TOOLS[active].desc}</p>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1.5">Nhập thông tin sản phẩm</label>
                <textarea
                  value={input} onChange={e=>setInput(e.target.value)}
                  rows={4}
                  placeholder="Ví dụ: Áo thun cotton unisex, màu trắng/đen/xám, size S-XL, giá 199.000đ..."
                  className="w-full px-4 py-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[12px] text-[13.5px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors resize-none"
                />
              </div>

              <button onClick={handleRun} disabled={loading||!input.trim()}
                className="flex items-center gap-2 px-5 py-2.5 rounded-[11px] text-white text-[13.5px] font-semibold hover:opacity-85 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                style={{background:'linear-gradient(135deg,#2563eb,#7c3aed)',boxShadow:'0 4px 12px rgba(79,70,229,0.3)'}}>
                {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>AI đang xử lý...</> : <><Zap size={15}/>Chạy AI ngay</>}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-[#fef2f2] border border-[#fecaca] rounded-[12px] text-[13px] text-[#dc2626] leading-relaxed">
                  {error}
                </div>
              )}

              {result && (
                <div className="mt-4 p-4 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[12px]">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle size={15} className="text-[#16a34a]"/>
                    <span className="text-[12.5px] font-semibold text-[#16a34a]">Kết quả từ Claude AI</span>
                  </div>
                  <p className="text-[13.5px] text-[#0f172a] leading-relaxed whitespace-pre-wrap">{result}</p>
                  <button onClick={()=>navigator.clipboard.writeText(result)} className="mt-3 text-[12.5px] font-semibold text-[#2563eb] hover:opacity-70 transition-opacity">
                    Sao chép kết quả →
                  </button>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
