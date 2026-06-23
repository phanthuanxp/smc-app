'use client';
import { useEffect, useState } from 'react';
import { Plus, RefreshCw, CheckCircle, XCircle, AlertCircle, Link2 } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import { CHANNEL_LABELS, ChannelBadgeLg, ChannelBadge } from '@/components/ChannelBadge';
import PageShell from '@/components/PageShell';

const CONNECTABLE = [
  { channel: 'tiktok', label: 'TikTok Shop', color: '#000' },
  { channel: 'shopee', label: 'Shopee', color: '#ee4d2d' },
];

const STATUS_ICON = { active: CheckCircle, inactive: XCircle, error: AlertCircle };
const STATUS_COLOR = { active: '#16a34a', inactive: '#94a3b8', error: '#dc2626' };
const STATUS_LABEL = { active: 'Đang kết nối', inactive: 'Ngừng hoạt động', error: 'Lỗi kết nối' };

export default function ShopsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('');
  const [syncing, setSyncing] = useState<number | null>(null);
  const [showConnect, setShowConnect] = useState(false);
  const [connectMsg, setConnectMsg] = useState('');

  const load = () => fetch('/api/shops').then(r => r.json()).then(setData);
  useEffect(() => { load(); }, []);

  const handleConnect = async (channel: string) => {
    setConnectMsg('');
    const res = await fetch(`/api/channels/${channel}/connect`);
    const data = await res.json();
    if (res.ok && data.authUrl) {
      // Redirect the browser to the platform's OAuth consent screen.
      window.location.href = data.authUrl;
    } else {
      setConnectMsg(data.error ?? 'Không khởi tạo được kết nối');
    }
  };

  const handleSync = async (shopId: number) => {
    setSyncing(shopId);
    await fetch('/api/channels/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shopId }),
    });
    await load();
    setSyncing(null);
  };

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/></div>;

  const { shops, counts } = data;
  const filtered = filter ? shops.filter((s: { channel: string }) => s.channel === filter) : shops;

  return (
    <PageShell
      title="Shop kết nối"
      subtitle="Quản lý tất cả các shop trên các kênh bán hàng"
      action={
        <button onClick={() => { setShowConnect(true); setConnectMsg(''); }} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
          <Plus size={15} strokeWidth={2.5}/> Kết nối shop mới
        </button>
      }
    >
      {/* Connect modal */}
      {showConnect && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowConnect(false); }}>
          <div className="bg-white rounded-[20px] p-6 w-[460px] shadow-2xl">
            <h3 className="text-[17px] font-bold text-[#0f172a] mb-1">Kết nối sàn bán hàng</h3>
            <p className="text-[13px] text-[#64748b] mb-5">Đăng nhập & uỷ quyền shop của bạn qua OAuth chính thức của sàn.</p>
            <div className="space-y-2.5">
              {CONNECTABLE.map(c => (
                <button key={c.channel} onClick={() => handleConnect(c.channel)}
                  className="w-full flex items-center gap-3 p-3.5 rounded-[12px] border border-[#e8edf5] hover:border-[#2563eb] hover:bg-[#f8faff] transition-all text-left">
                  <span className="w-9 h-9 rounded-[9px] flex items-center justify-center text-white text-[13px] font-bold" style={{ background: c.color }}>{c.label.charAt(0)}</span>
                  <div className="flex-1">
                    <div className="text-[14px] font-semibold text-[#0f172a]">{c.label}</div>
                    <div className="text-[11.5px] text-[#94a3b8]">Kết nối qua OAuth chính thức</div>
                  </div>
                  <Link2 size={16} className="text-[#94a3b8]" />
                </button>
              ))}
            </div>
            {connectMsg && (
              <div className="mt-4 p-3 bg-[#fff7ed] border border-[#fed7aa] rounded-[10px] text-[12.5px] text-[#ea580c] leading-relaxed">{connectMsg}</div>
            )}
            <button onClick={() => setShowConnect(false)} className="mt-5 w-full h-10 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Đóng</button>
          </div>
        </div>
      )}

      {/* Channel summary */}
      <div className="grid grid-cols-6 gap-3.5 mb-6">
        {(counts as {channel:string;count:number;revenue:number;orders:number}[]).map(c=>{
          const ch = CHANNEL_LABELS[c.channel] ?? { bg:'#f1f5f9', color:'#64748b', short:c.channel[0].toUpperCase(), label:c.channel };
          return (
            <button key={c.channel} onClick={()=>setFilter(filter===c.channel?'':c.channel)}
              className={`bg-white border rounded-[16px] p-4 text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${filter===c.channel?'border-[#2563eb] ring-1 ring-[#2563eb]':'border-[#e8edf5]'}`}
              style={{boxShadow:'0 2px 8px rgba(15,23,42,0.04)'}}>
              <div className="mb-2.5"><ChannelBadgeLg channel={c.channel}/></div>
              <div className="text-[12px] text-[#64748b] mb-0.5">{ch.label}</div>
              <div className="text-[20px] font-extrabold text-[#0f172a]">{c.count} <span className="text-[12px] font-medium text-[#94a3b8]">shop</span></div>
              <div className="text-[11px] text-[#64748b] mt-1">{Math.round(c.revenue/1_000_000).toLocaleString('vi-VN')}M doanh thu</div>
            </button>
          );
        })}
      </div>

      {/* Shop list */}
      <Card>
        <SectionHeader
          title={`Danh sách shop ${filter ? `(${CHANNEL_LABELS[filter]?.label??filter})` : ''}`}
          action={
            <button onClick={()=>setFilter('')} className="text-[12.5px] text-[#2563eb] font-semibold hover:opacity-70 transition-opacity">
              {filter ? 'Xem tất cả' : ''}
            </button>
          }
        />
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f3f8]">
              {['Tên shop','Kênh','Trạng thái','Sản phẩm','Doanh thu','Đơn hàng','Ngày kết nối',''].map((h,i)=>(
                <th key={i} className="text-left text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s:{id:number;name:string;channel:string;status:'active'|'inactive'|'error';product_count:number;revenue:number;orders:number;connected_at:string})=>{
              const Icon = STATUS_ICON[s.status] ?? CheckCircle;
              const ch = CHANNEL_LABELS[s.channel] ?? { bg:'#f1f5f9', color:'#64748b', short:s.channel[0], label:s.channel };
              return (
                <tr key={s.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-3 py-3 font-semibold text-[13px] text-[#0f172a]">{s.name}</td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[12px] font-semibold text-white" style={{background:ch.bg==='#f1f5f9'?'#64748b':ch.bg}}>
                      <ChannelBadge channel={s.channel}/> {ch.label}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium" style={{color:STATUS_COLOR[s.status]}}>
                      <Icon size={13} /> {STATUS_LABEL[s.status]}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[13px] text-[#374151] font-medium">{s.product_count.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-3 text-[13px] font-semibold text-[#0f172a]">{Math.round(s.revenue/1_000_000).toLocaleString('vi-VN')}M đ</td>
                  <td className="px-3 py-3 text-[13px] text-[#374151]">{s.orders.toLocaleString('vi-VN')}</td>
                  <td className="px-3 py-3 text-[12px] text-[#64748b]">{s.connected_at.slice(0,10)}</td>
                  <td className="px-3 py-3">
                    <button
                      onClick={() => handleSync(s.id)}
                      disabled={syncing === s.id}
                      className="flex items-center gap-1 text-[12px] text-[#2563eb] font-semibold hover:opacity-70 disabled:opacity-50 transition-opacity"
                    >
                      <RefreshCw size={12} className={syncing === s.id ? 'animate-spin' : ''}/>
                      {syncing === s.id ? 'Đang đồng bộ' : 'Đồng bộ'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
    </PageShell>
  );
}
