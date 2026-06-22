'use client';
import { useEffect, useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Card, { SectionHeader } from '@/components/Card';
import PageShell from '@/components/PageShell';
import { DollarSign, ShoppingCart, Package, Home } from 'lucide-react';

const COLORS = ['#2563eb','#7c3aed','#10b981','#f59e0b','#ef4444','#06b6d4'];
const CH_LABELS: Record<string,string> = { tiktok:'TikTok', shopee:'Shopee', lazada:'Lazada', facebook:'Facebook', tiki:'Tiki', website:'Website' };

export default function ReportsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ fetch('/api/reports').then(r=>r.json()).then(setData); },[]);

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/></div>;

  const { revenueByChannel, topProducts, dailyStats, summary } = data;

  const channelPie = revenueByChannel.map((r:{channel:string;revenue:number})=>({ name:CH_LABELS[r.channel]??r.channel, value:Math.round(r.revenue/1_000_000) }));

  const byDate: Record<string,{gmv:number;orders:number}> = {};
  for (const s of dailyStats as {date:string;channel:string;gmv:number;orders:number}[]) {
    if (!byDate[s.date]) byDate[s.date] = {gmv:0,orders:0};
    byDate[s.date].gmv += s.gmv;
    byDate[s.date].orders += s.orders;
  }
  const lineData = Object.entries(byDate).map(([date,v])=>({ date:date.slice(5), 'GMV (tr.đ)':Math.round(v.gmv/1_000_000), 'Đơn hàng':v.orders }));

  const KPIs = [
    { icon:DollarSign,   bg:'#fffbeb', color:'#d97706', label:'Tổng doanh thu',    value:Math.round(summary.totalRevenue/1_000_000).toLocaleString('vi-VN')+'M đ' },
    { icon:ShoppingCart, bg:'#eff6ff', color:'#2563eb', label:'Tổng đơn hàng',     value:summary.totalOrders.toLocaleString('vi-VN') },
    { icon:Package,      bg:'#f5f3ff', color:'#7c3aed', label:'Tổng sản phẩm',     value:summary.totalProducts.toLocaleString('vi-VN') },
    { icon:Home,         bg:'#f0fdf4', color:'#16a34a', label:'Shop đang hoạt động',value:summary.totalShops },
  ];

  return (
    <PageShell title="Báo cáo & Phân tích" subtitle="Tổng hợp hiệu suất kinh doanh theo kênh và thời gian">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {KPIs.map((k,i)=>{const Icon=k.icon;return(
          <div key={i} className="bg-white border border-[#e8edf5] rounded-[18px] p-4" style={{boxShadow:'0 2px 8px rgba(15,23,42,0.04)'}}>
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center mb-3" style={{background:k.bg}}><Icon size={19} style={{color:k.color}} strokeWidth={1.8}/></div>
            <p className="text-[11.5px] text-[#64748b] font-medium mb-1">{k.label}</p>
            <p className="text-[20px] font-extrabold text-[#0f172a] tracking-tight">{k.value}</p>
          </div>
        );})}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-4 mb-4" style={{gridTemplateColumns:'2fr 1fr'}}>
        <Card padding="p-5">
          <SectionHeader title="Doanh thu & Đơn hàng theo ngày" />
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={lineData} margin={{top:4,right:4,left:-20,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f8" vertical={false}/>
              <XAxis dataKey="date" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="l" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis yAxisId="r" orientation="right" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e8edf5',boxShadow:'0 4px 16px rgba(0,0,0,0.08)'}}/>
              <Legend wrapperStyle={{fontSize:12,color:'#64748b'}}/>
              <Line yAxisId="l" type="monotone" dataKey="GMV (tr.đ)" stroke="#2563eb" strokeWidth={2.5} dot={{r:3,fill:'#2563eb'}} activeDot={{r:5}}/>
              <Line yAxisId="r" type="monotone" dataKey="Đơn hàng" stroke="#10b981" strokeWidth={2.5} dot={{r:3,fill:'#10b981'}} activeDot={{r:5}}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card padding="p-5">
          <SectionHeader title="Phân bổ doanh thu theo kênh" />
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={channelPie} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value" label={false} labelLine={false} fontSize={11}>
                {channelPie.map((_:unknown,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
              </Pie>
              <Tooltip formatter={(v)=>[String(v)+'M đ','Doanh thu']} contentStyle={{borderRadius:12,border:'1px solid #e8edf5'}}/>
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-4" style={{gridTemplateColumns:'1fr 1fr'}}>
        <Card padding="p-5">
          <SectionHeader title="Top sản phẩm bán chạy nhất" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(topProducts as {name:string;sold:number;revenue:number}[]).slice(0,6).map(p=>({...p,name:p.name.slice(0,18)+(p.name.length>18?'…':'')}))} margin={{top:4,right:4,left:-20,bottom:40}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f8" vertical={false}/>
              <XAxis dataKey="name" tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} angle={-20} textAnchor="end"/>
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e8edf5'}}/>
              <Bar dataKey="sold" name="Đã bán" fill="#2563eb" fillOpacity={0.85} radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card padding="p-5">
          <SectionHeader title="Doanh thu theo kênh" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={(revenueByChannel as {channel:string;revenue:number;orders:number}[]).map(r=>({...r,channel:CH_LABELS[r.channel]??r.channel,'Doanh thu (tr.đ)':Math.round(r.revenue/1_000_000)}))} margin={{top:4,right:4,left:-10,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f8" vertical={false}/>
              <XAxis dataKey="channel" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e8edf5'}}/>
              <Bar dataKey="Doanh thu (tr.đ)" fill="#4f46e5" fillOpacity={0.85} radius={[5,5,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageShell>
  );
}
