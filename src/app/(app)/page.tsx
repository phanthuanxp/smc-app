'use client';
import { useEffect, useState } from 'react';
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, LineChart
} from 'recharts';
import {
  Home, Package, ShoppingCart, DollarSign, AlertTriangle, AlertCircle,
  Link2, FileEdit, FileText, Search, Image, Video, Share2, ChevronRight,
  TrendingUp, TrendingDown, Star
} from 'lucide-react';
import Card, { SectionHeader, ViewAll } from '@/components/Card';
import StatusPill from '@/components/StatusPill';
import { ChannelBadge, ChannelChip } from '@/components/ChannelBadge';
import PageShell from '@/components/PageShell';

const FMT_VND = (n: number) =>
  new Intl.NumberFormat('vi-VN').format(Math.round(n)) + 'đ';

const KPI_ICONS = [
  { icon: Home,          bg: '#eff6ff', color: '#2563eb' },
  { icon: Package,       bg: '#f5f3ff', color: '#7c3aed' },
  { icon: ShoppingCart,  bg: '#f0fdf4', color: '#16a34a' },
  { icon: DollarSign,    bg: '#fffbeb', color: '#d97706' },
  { icon: AlertTriangle, bg: '#fff7ed', color: '#ea580c' },
  { icon: AlertCircle,   bg: '#fef2f2', color: '#dc2626' },
];

const AI_ACTIONS = [
  { icon: Link2,    bg: '#fff7ed', color: '#d97706', label: 'Import từ link' },
  { icon: FileEdit, bg: '#eff6ff', color: '#2563eb', label: 'AI viết tiêu đề' },
  { icon: FileText, bg: '#f0fdf4', color: '#16a34a', label: 'AI viết mô tả' },
  { icon: Search,   bg: '#fef2f2', color: '#dc2626', label: 'AI tối ưu SEO' },
  { icon: Image,    bg: '#f5f3ff', color: '#7c3aed', label: 'Tạo ảnh sản phẩm' },
  { icon: Video,    bg: '#fdf2f8', color: '#c026d3', label: 'Tạo video KOL' },
  { icon: Share2,   bg: '#f0fdf4', color: '#16a34a', label: 'Đăng lên tất cả shop' },
];

const CHANNEL_COUNTS = [
  { channel: 'tiktok', count: 5 },
  { channel: 'shopee', count: 6 },
  { channel: 'lazada', count: 4 },
  { channel: 'tiki',   count: 3 },
  { channel: 'facebook', count: 3 },
  { channel: 'website', count: 2 },
];

function stockColor(s: number) {
  if (s === 0) return 'text-[#dc2626] font-bold';
  if (s < 50)  return 'text-[#ea580c] font-bold';
  return 'text-[#16a34a] font-bold';
}
function productStatus(s: number) {
  if (s === 0) return 'out_of_stock';
  if (s < 50)  return 'low_stock';
  return 'active';
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const Tip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-[#e8edf5] rounded-xl p-3 shadow-lg text-[12px]">
      <p className="font-bold text-[#0f172a] mb-1">{label}</p>
      {payload.map((p: { color: string; name: string; value: number }, i: number) => (
        <p key={i} className="flex items-center gap-1.5 text-[#64748b]">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          {p.name}: <span className="font-semibold text-[#0f172a]">{p.value}</span>
        </p>
      ))}
    </div>
  );
};

const EMOJIS = ['👕','👖','🎧','🍶','🧴','👟','👗','🎒','💧','💡','🧥','💆','🍳','👠','💊','🔪'];

export default function DashboardPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetch('/api/dashboard').then(r => r.json()).then(setData);
  }, []);

  if (!data) return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-[13px] text-[#64748b]">Đang tải dữ liệu...</p>
      </div>
    </div>
  );

  const { kpis, recentOrders, topProducts, trends, dailyStats } = data;

  const kpiCards = [
    { label: 'Tổng shop đang kết nối', value: kpis.shops,         fmt: 'n',   trend: '+15.0%', up: true,  note: 'so với tuần trước' },
    { label: 'Tổng sản phẩm',          value: kpis.products,      fmt: 'n',   trend: '+8.7%',  up: true,  note: 'so với tuần trước' },
    { label: 'Đơn hàng hôm nay',       value: kpis.todayOrders,   fmt: 'n',   trend: '+12.3%', up: true,  note: 'so với hôm qua' },
    { label: 'Doanh thu hôm nay',       value: kpis.todayRevenue,  fmt: 'vnd', trend: '+18.6%', up: true,  note: 'so với hôm qua' },
    { label: 'Tồn kho cần chú ý',      value: kpis.lowStock,      fmt: 'n',   trend: '-5.3%',  up: false, note: 'so với hôm qua' },
    { label: 'Listing lỗi / chờ duyệt', value: kpis.errorListings, fmt: 'n',   trend: '-12.1%', up: false, note: 'so với hôm qua' },
  ];

  // Build chart data
  const byDate: Record<string, { gmv: number; orders: number }> = {};
  for (const s of dailyStats as { date: string; channel: string; gmv: number; orders: number }[]) {
    if (!byDate[s.date]) byDate[s.date] = { gmv: 0, orders: 0 };
    byDate[s.date].gmv    += s.gmv;
    byDate[s.date].orders += s.orders;
  }
  const chartData = Object.entries(byDate).map(([date, v]) => ({
    date: date.slice(5),
    'GMV (tr.đ)': Math.round(v.gmv / 1_000_000),
    'Đơn hàng': v.orders,
  }));

  const ALERTS = [
    { icon: AlertTriangle, bg: '#fff7ed', color: '#ea580c', label: 'Sản phẩm sắp hết hàng',        val: `${kpis.lowStock} sản phẩm`,       vc: '#ea580c' },
    { icon: AlertTriangle, bg: '#fff7ed', color: '#f59e0b', label: 'Tỷ lệ trả hàng cao bất thường', val: '5 sản phẩm',                       vc: '#f59e0b' },
    { icon: AlertCircle,   bg: '#fef2f2', color: '#dc2626', label: 'Listing chờ duyệt',              val: `${kpis.errorListings} listings`,   vc: '#dc2626' },
    { icon: AlertCircle,   bg: '#fef2f2', color: '#dc2626', label: 'Lỗi đồng bộ sản phẩm',          val: '18 sản phẩm',                      vc: '#dc2626' },
    { icon: TrendingUp,    bg: '#f0fdf4', color: '#16a34a', label: 'Gợi ý sản phẩm bán chạy',       val: '12 gợi ý',                         vc: '#16a34a' },
  ];

  return (
    <PageShell
      title="Tổng quan Shop Management Core"
      subtitle="Quản lý sản phẩm, đơn hàng và đa kênh bán hàng tập trung"
    >
      {/* KPI */}
      <div className="grid grid-cols-6 gap-3.5 mb-5">
        {kpiCards.map((k, i) => {
          const { icon: Icon, bg, color } = KPI_ICONS[i];
          return (
            <div key={i} className="bg-white border border-[#e8edf5] rounded-[18px] p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
              <div className="w-10 h-10 rounded-[11px] flex items-center justify-center mb-3" style={{ background: bg }}>
                <Icon size={19} style={{ color }} strokeWidth={1.8} />
              </div>
              <p className="text-[11.5px] text-[#64748b] font-medium leading-snug mb-1">{k.label}</p>
              <p className="font-extrabold text-[#0f172a] tracking-tight leading-none">
                {k.fmt === 'vnd'
                  ? <span className="text-[15px]">{FMT_VND(Number(k.value))}</span>
                  : <span className="text-[22px]">{Number(k.value).toLocaleString('vi-VN')}</span>
                }
              </p>
              <p className={`flex items-center gap-1 mt-1.5 text-[11px] font-medium ${k.up ? 'text-[#10b981]' : 'text-[#ef4444]'}`}>
                {k.up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                {k.trend} <span className="text-[#94a3b8] font-normal">{k.note}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Channels */}
      <Card className="mb-5">
        <SectionHeader title="Kênh bán hàng đang kết nối" />
        <div className="flex gap-2.5 flex-wrap">
          {CHANNEL_COUNTS.map(c => <ChannelChip key={c.channel} channel={c.channel} count={c.count} />)}
        </div>
      </Card>

      {/* Product Table + AI Studio */}
      <div className="grid mb-5" style={{ gridTemplateColumns: '1fr 280px', gap: '18px' }}>
        <Card>
          <SectionHeader
            title={<span className="flex items-center gap-2"><span className="w-7 h-7 bg-[#eff6ff] rounded-[8px] flex items-center justify-center"><Package size={14} className="text-[#2563eb]" /></span>Master Product Center</span>}
            action={<ViewAll href="/products" label="Xem tất cả sản phẩm →" />}
          />
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#f0f3f8]">
                  {['','Mã SP','Tên sản phẩm','Danh mục','Kênh đã đăng','Tồn kho','Giá bán','Trạng thái',''].map((h,i)=>(
                    <th key={i} className="text-left text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {topProducts.map((p: { id: number; sku: string; name: string; category: string; channels: string; stock: number; price: number }, idx: number) => {
                  const channels = p.channels ? p.channels.split(',').filter(Boolean) : [];
                  return (
                    <tr key={p.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                      <td className="px-3 py-2.5">
                        <div className="w-8 h-8 rounded-[8px] bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] flex items-center justify-center text-[14px]">{EMOJIS[idx]??'📦'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-[11.5px] text-[#94a3b8] font-medium whitespace-nowrap">{p.sku}</td>
                      <td className="px-3 py-2.5 max-w-[180px]"><p className="text-[13px] font-semibold text-[#0f172a] truncate">{p.name}</p></td>
                      <td className="px-3 py-2.5 text-[12.5px] text-[#64748b] whitespace-nowrap">{p.category}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 items-center">
                          {channels.slice(0,3).map(ch=><ChannelBadge key={ch} channel={ch}/>)}
                          {channels.length>3&&<span className="h-5 px-1.5 bg-[#f1f5f9] text-[#64748b] text-[9.5px] font-semibold rounded-[5px] flex items-center">+{channels.length-3}</span>}
                        </div>
                      </td>
                      <td className={`px-3 py-2.5 text-[13px] ${stockColor(p.stock)}`}>{p.stock}</td>
                      <td className="px-3 py-2.5 text-[13px] font-semibold text-[#0f172a] whitespace-nowrap">{Number(p.price).toLocaleString('vi-VN')}đ</td>
                      <td className="px-3 py-2.5"><StatusPill status={productStatus(p.stock)} /></td>
                      <td className="px-3 py-2.5"><button className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#94a3b8] hover:bg-[#f1f5f9] transition-colors text-lg leading-none">···</button></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="flex flex-col">
          <SectionHeader title={<span className="flex items-center gap-2"><span className="w-7 h-7 rounded-[8px] flex items-center justify-center" style={{background:'linear-gradient(135deg,#eff6ff,#f5f3ff)'}}><Star size={13} className="text-[#7c3aed]"/></span>AI Product Studio</span>} />
          <div className="flex-1">
            {AI_ACTIONS.map(a=>{
              const Icon=a.icon;
              return(
                <div key={a.label} className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] hover:bg-[#f6f8fc] cursor-pointer transition-colors group">
                  <div className="w-8 h-8 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{background:a.bg}}><Icon size={14} style={{color:a.color}}/></div>
                  <span className="text-[13px] font-medium text-[#374151] flex-1">{a.label}</span>
                  <ChevronRight size={13} className="text-[#cbd5e1] group-hover:text-[#94a3b8] transition-colors"/>
                </div>
              );
            })}
          </div>
          <div className="mt-4">
            <button className="w-full py-3 rounded-[11px] text-white text-[13.5px] font-bold hover:opacity-85 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#7c3aed)',boxShadow:'0 4px 14px rgba(79,70,229,0.35)'}}>
              Bắt đầu với AI ngay ✨
            </button>
            <p className="text-[11px] text-[#94a3b8] text-center mt-2">Tiết kiệm thời gian – Tăng hiệu suất bán hàng</p>
          </div>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-4 gap-4">
        {/* Channel chart */}
        <Card padding="p-5">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[15px] font-bold text-[#0f172a]">Hiệu suất kênh bán</span>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2.5 text-[11px] text-[#64748b]">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-[3px] bg-[#2563eb] inline-block"/> GMV</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981] inline-block"/> Đơn</span>
              </div>
              <select className="text-[11.5px] border border-[#e8edf5] rounded-[7px] px-2 py-1 bg-white outline-none cursor-pointer">
                <option>7 ngày qua</option><option>30 ngày qua</option>
              </select>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={170}>
            <ComposedChart data={chartData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f8" vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="l" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="r" orientation="right" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip content={<Tip/>}/>
              <Bar yAxisId="l" dataKey="GMV (tr.đ)" fill="#2563eb" fillOpacity={0.15} stroke="#2563eb" strokeWidth={1.5} radius={[4,4,0,0]}/>
              <Line yAxisId="r" type="monotone" dataKey="Đơn hàng" stroke="#10b981" strokeWidth={2.5} dot={{fill:'#10b981',r:3}} activeDot={{r:5}}/>
            </ComposedChart>
          </ResponsiveContainer>
          <div className="mt-2 text-right">
            <a href="/reports" className="text-[12px] text-[#2563eb] font-semibold hover:opacity-70 transition-opacity">Xem báo cáo chi tiết →</a>
          </div>
        </Card>

        {/* Alerts */}
        <Card padding="p-5">
          <SectionHeader title="Cảnh báo thông minh" action={<ViewAll label="Xem tất cả"/>}/>
          {ALERTS.map((a,i)=>{const Icon=a.icon;return(
            <div key={i} className="flex items-center gap-2.5 py-2 border-b border-[#f0f3f8] last:border-0">
              <div className="w-7 h-7 rounded-[8px] flex items-center justify-center flex-shrink-0" style={{background:a.bg}}><Icon size={13} style={{color:a.color}}/></div>
              <span className="flex-1 text-[12.5px] text-[#374151]">{a.label}</span>
              <span className="text-[12px] font-bold whitespace-nowrap" style={{color:a.vc}}>{a.val}</span>
            </div>
          );})}
        </Card>

        {/* Recent Orders */}
        <Card padding="p-5">
          <SectionHeader title="Đơn hàng gần đây" action={<ViewAll href="/orders" label="Xem tất cả →"/>}/>
          {recentOrders.map((o:{id:number;order_no:string;customer_name:string;total:number;status:string},i:number)=>{
            const colors=['#2563eb','#ea580c','#16a34a','#0891b2','#dc2626'];
            const ci=o.id%colors.length;
            return(
              <div key={o.id} className="flex items-center gap-2.5 py-2 border-b border-[#f0f3f8] last:border-0">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold flex-shrink-0"
                  style={{background:`linear-gradient(135deg,${colors[ci]},${colors[(ci+1)%colors.length]})`}}>
                  {o.customer_name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-semibold text-[#0f172a]">#{o.order_no}</p>
                  <p className="text-[11.5px] text-[#64748b] truncate">{o.customer_name}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[12px] font-semibold text-[#0f172a] whitespace-nowrap mb-0.5">{Number(o.total).toLocaleString('vi-VN')}đ</p>
                  <StatusPill status={o.status}/>
                </div>
              </div>
            );
          })}
        </Card>

        {/* Market Trends */}
        <Card padding="p-5">
          <SectionHeader title="Xu hướng thị trường" action={<ViewAll href="/market" label="Xem thêm"/>}/>
          <p className="text-[11.5px] text-[#64748b] font-medium mb-2">Từ khóa nổi bật tuần qua</p>
          <div className="flex flex-wrap gap-1.5 mb-4">
            {trends.slice(0,6).map((t:{keyword:string;trend:string})=>(
              <span key={t.keyword} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-semibold"
                style={t.trend==='up'?{background:'#dcfce7',color:'#16a34a'}:{background:'#fef2f2',color:'#dc2626'}}>
                {t.keyword} {t.trend==='up'?'↑':'↓'}
              </span>
            ))}
          </div>
          <p className="text-[11.5px] text-[#64748b] font-medium mb-2">Chỉ số quan tâm</p>
          <ResponsiveContainer width="100%" height={70}>
            <LineChart data={trends.slice(0,7).map((t:{keyword:string;score:number})=>({name:t.keyword.slice(0,5),score:t.score}))} margin={{top:4,right:4,left:-30,bottom:0}}>
              <XAxis dataKey="name" tick={{fontSize:9,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis hide/>
              <Tooltip content={<Tip/>}/>
              <Line type="monotone" dataKey="score" stroke="#4f46e5" strokeWidth={2} dot={{fill:'#4f46e5',r:2.5}}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageShell>
  );
}
