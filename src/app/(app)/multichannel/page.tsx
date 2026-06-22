'use client';
import { useState } from 'react';
import { Share2, CheckCircle, Clock, AlertCircle, ChevronDown } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import { ChannelBadge } from '@/components/ChannelBadge';
import PageShell from '@/components/PageShell';

const CHANNELS_LIST = [
  { channel:'tiktok',   shops:['TikTok Shop VN 1','TikTok Shop VN 2','TikTok Fashion','TikTok Beauty','TikTok Electronics'] },
  { channel:'shopee',   shops:['Shopee Store Chính','Shopee Fashion VN','Shopee Beauty & Care','Shopee Electronics','Shopee Home & Living','Shopee Sport'] },
  { channel:'lazada',   shops:['Lazada VN Official','Lazada Fashion Hub','Lazada Tech Store'] },
  { channel:'tiki',     shops:['Tiki Store Chính','Tiki Fashion','Tiki Electronics'] },
  { channel:'facebook', shops:['Facebook Shop Main','Facebook Beauty Shop'] },
  { channel:'website',  shops:['Website Chính Thức','Website B2B'] },
];

const PRODUCTS_DEMO = [
  { id:1, name:'Áo thun cotton unisex basic', sku:'SP001245' },
  { id:2, name:'Quần jean ống suông nữ', sku:'SP001246' },
  { id:3, name:'Tai nghe Bluetooth Pro 5.0', sku:'SP001247' },
];

export default function MultichannelPage() {
  const [selectedProduct, setSelectedProduct] = useState<number|null>(null);
  const [selectedShops, setSelectedShops] = useState<Set<string>>(new Set());
  const [publishing, setPublishing] = useState(false);
  const [results, setResults] = useState<{shop:string;status:string}[]>([]);

  const toggleShop = (shop: string) => {
    setSelectedShops(prev => {
      const next = new Set(prev);
      if (next.has(shop)) next.delete(shop); else next.add(shop);
      return next;
    });
  };

  const selectAll = () => {
    const all = CHANNELS_LIST.flatMap(c=>c.shops);
    setSelectedShops(new Set(all));
  };

  const handlePublish = async () => {
    if (!selectedProduct || selectedShops.size === 0) return;
    setPublishing(true);
    setResults([]);
    // Map each selected shop name to its channel for the publish payload.
    const shops = Array.from(selectedShops).map(name => ({
      shopName: name,
      channel: CHANNELS_LIST.find(c => c.shops.includes(name))?.channel ?? 'website',
    }));
    try {
      const res = await fetch('/api/channels/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: selectedProduct, shops }),
      });
      const data = await res.json();
      const mapped = (data.results ?? []).map((r: { shopName: string; status: string }) => ({
        shop: r.shopName,
        status: r.status === 'success' ? 'completed' : r.status,
      }));
      setResults(mapped);
    } catch {
      setResults(Array.from(selectedShops).map(s => ({ shop: s, status: 'error' })));
    }
    setPublishing(false);
  };

  return (
    <PageShell title="Đăng đa kênh" subtitle="Đăng và đồng bộ sản phẩm lên nhiều kênh bán hàng cùng lúc">
      <div className="grid gap-5" style={{gridTemplateColumns:'1fr 360px'}}>
        {/* Left: product + channel selection */}
        <div className="space-y-4">
          {/* Product select */}
          <Card padding="p-5">
            <SectionHeader title="1. Chọn sản phẩm cần đăng" />
            <div className="space-y-2">
              {PRODUCTS_DEMO.map(p=>(
                <button key={p.id} onClick={()=>setSelectedProduct(p.id)}
                  className={`w-full flex items-center gap-3 p-3.5 rounded-[12px] border text-left transition-all ${selectedProduct===p.id?'border-[#2563eb] bg-[#eff6ff]':'border-[#e8edf5] hover:border-[#c7d2fe]'}`}>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:selectedProduct===p.id?'#2563eb':'#e2e8f0'}}/>
                  <div>
                    <p className={`text-[13px] font-semibold ${selectedProduct===p.id?'text-[#2563eb]':'text-[#0f172a]'}`}>{p.name}</p>
                    <p className="text-[11.5px] text-[#94a3b8]">{p.sku}</p>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          {/* Channel selection */}
          <Card padding="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[15px] font-bold text-[#0f172a]">2. Chọn kênh & shop đăng</h2>
              <button onClick={selectAll} className="text-[12.5px] font-semibold text-[#2563eb] hover:opacity-70 transition-opacity">Chọn tất cả</button>
            </div>
            <div className="space-y-4">
              {CHANNELS_LIST.map(c=>(
                <div key={c.channel}>
                  <div className="flex items-center gap-2 mb-2">
                    <ChannelBadge channel={c.channel}/>
                    <span className="text-[13px] font-semibold text-[#374151] capitalize">{c.channel==='facebook'?'Facebook Shop':c.channel==='tiktok'?'TikTok Shop':c.channel.charAt(0).toUpperCase()+c.channel.slice(1)}</span>
                    <ChevronDown size={13} className="text-[#94a3b8]"/>
                  </div>
                  <div className="grid grid-cols-2 gap-2 ml-7">
                    {c.shops.map(shop=>(
                      <button key={shop} onClick={()=>toggleShop(shop)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-[9px] border text-[12.5px] font-medium text-left transition-all ${selectedShops.has(shop)?'border-[#2563eb] bg-[#eff6ff] text-[#2563eb]':'border-[#e8edf5] text-[#374151] hover:border-[#c7d2fe]'}`}>
                        <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 ${selectedShops.has(shop)?'bg-[#2563eb] border-[#2563eb]':'border-[#cbd5e1]'}`}>
                          {selectedShops.has(shop)&&<CheckCircle size={10} className="text-white"/>}
                        </div>
                        <span className="truncate">{shop}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: summary + publish */}
        <div className="space-y-4">
          <Card padding="p-5">
            <SectionHeader title="Tóm tắt đăng bài" />
            <div className="space-y-3 mb-5">
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748b]">Sản phẩm</span>
                <span className="font-semibold text-[#0f172a]">{selectedProduct ? PRODUCTS_DEMO.find(p=>p.id===selectedProduct)?.name.slice(0,20)+'…' : 'Chưa chọn'}</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748b]">Số shop đăng</span>
                <span className="font-bold text-[#2563eb]">{selectedShops.size} shop</span>
              </div>
              <div className="flex justify-between text-[13px]">
                <span className="text-[#64748b]">Kênh</span>
                <div className="flex gap-1">
                  {[...new Set([...selectedShops].map(s=>CHANNELS_LIST.find(c=>c.shops.includes(s))?.channel).filter(Boolean))].map(ch=><ChannelBadge key={ch!} channel={ch!}/>)}
                </div>
              </div>
            </div>
            <button
              onClick={handlePublish}
              disabled={!selectedProduct || selectedShops.size===0 || publishing}
              className="w-full py-3 rounded-[12px] text-white text-[14px] font-bold flex items-center justify-center gap-2 hover:opacity-85 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
              style={{background:'linear-gradient(135deg,#2563eb,#7c3aed)',boxShadow:'0 4px 14px rgba(79,70,229,0.35)'}}>
              {publishing ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Đang đăng...</> : <><Share2 size={15}/>Đăng lên {selectedShops.size} shop</>}
            </button>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card padding="p-5">
              <SectionHeader title="Kết quả đăng bài" />
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                {results.map((r,i)=>(
                  <div key={i} className="flex items-center gap-2.5 py-1.5">
                    {r.status==='completed'
                      ? <CheckCircle size={14} className="text-[#16a34a] flex-shrink-0"/>
                      : r.status==='error'
                        ? <AlertCircle size={14} className="text-[#dc2626] flex-shrink-0"/>
                        : <Clock size={14} className="text-[#ea580c] flex-shrink-0"/>
                    }
                    <span className="text-[12.5px] text-[#374151] flex-1 truncate">{r.shop}</span>
                    <span className={`text-[11px] font-semibold ${r.status==='completed'?'text-[#16a34a]':r.status==='error'?'text-[#dc2626]':'text-[#ea580c]'}`}>
                      {r.status==='completed'?'Thành công':r.status==='error'?'Lỗi':'Đang xử lý'}
                    </span>
                  </div>
                ))}
              </div>
              {!publishing && (
                <div className="mt-3 pt-3 border-t border-[#f0f3f8] flex justify-between text-[12.5px]">
                  <span className="text-[#16a34a] font-semibold">{results.filter(r=>r.status==='completed').length} thành công</span>
                  <span className="text-[#dc2626] font-semibold">{results.filter(r=>r.status==='error').length} lỗi</span>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
