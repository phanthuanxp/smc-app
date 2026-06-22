'use client';
import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import Card, { SectionHeader } from '@/components/Card';
import PageShell from '@/components/PageShell';

export default function MarketPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  useEffect(()=>{ fetch('/api/market').then(r=>r.json()).then(setData); },[]);

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/></div>;
  const { trends } = data;

  const barData = [...trends].sort((a:{score:number},b:{score:number})=>b.score-a.score).slice(0,8)
    .map((t:{keyword:string;score:number})=>({ keyword:t.keyword.slice(0,12), score:t.score }));

  const radarData = trends.slice(0,6).map((t:{keyword:string;score:number})=>({ subject:t.keyword.slice(0,8), A:t.score }));

  return (
    <PageShell title="Phân tích thị trường" subtitle="Xu hướng tìm kiếm và nhu cầu thị trường theo từ khóa">
      {/* Trend tags */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card padding="p-5">
          <SectionHeader title="Từ khóa đang tăng trưởng" />
          <div className="space-y-2.5">
            {(trends as {keyword:string;trend:string;score:number}[]).filter(t=>t.trend==='up').map((t,i)=>(
              <div key={i} className="flex items-center gap-3 p-3 bg-[#f0fdf4] rounded-[12px] border border-[#bbf7d0]">
                <TrendingUp size={16} className="text-[#16a34a] flex-shrink-0"/>
                <span className="flex-1 text-[13.5px] font-semibold text-[#0f172a]">{t.keyword}</span>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 rounded-full bg-[#16a34a]" style={{width:t.score+'px'}}/>
                  <span className="text-[12px] font-bold text-[#16a34a]">{t.score}</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card padding="p-5">
          <SectionHeader title="Từ khóa đang giảm" />
          <div className="space-y-2.5">
            {(trends as {keyword:string;trend:string;score:number}[]).filter(t=>t.trend!=='up').map((t,i)=>{
              const Icon = t.trend==='down' ? TrendingDown : Minus;
              const bg = t.trend==='down' ? '#fef2f2' : '#f8fafc';
              const border = t.trend==='down' ? '#fecaca' : '#e2e8f0';
              const color = t.trend==='down' ? '#dc2626' : '#94a3b8';
              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-[12px] border" style={{background:bg,borderColor:border}}>
                  <Icon size={16} style={{color}} className="flex-shrink-0"/>
                  <span className="flex-1 text-[13.5px] font-semibold text-[#0f172a]">{t.keyword}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="h-2 rounded-full" style={{width:t.score+'px',background:color}}/>
                    <span className="text-[12px] font-bold" style={{color}}>{t.score}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4" style={{gridTemplateColumns:'3fr 2fr'}}>
        <Card padding="p-5">
          <SectionHeader title="Chỉ số quan tâm theo từ khóa" />
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} margin={{top:4,right:4,left:-10,bottom:50}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f3f8" vertical={false}/>
              <XAxis dataKey="keyword" tick={{fontSize:11,fill:'#94a3b8'}} axisLine={false} tickLine={false} angle={-30} textAnchor="end"/>
              <YAxis tick={{fontSize:10,fill:'#94a3b8'}} axisLine={false} tickLine={false} domain={[0,100]}/>
              <Tooltip contentStyle={{borderRadius:12,border:'1px solid #e8edf5'}}/>
              <Bar dataKey="score" name="Chỉ số quan tâm" fill="#4f46e5" fillOpacity={0.85} radius={[6,6,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card padding="p-5">
          <SectionHeader title="Bản đồ từ khóa" />
          <ResponsiveContainer width="100%" height={240}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e8edf5"/>
              <PolarAngleAxis dataKey="subject" tick={{fontSize:11,fill:'#64748b'}}/>
              <Radar name="Chỉ số" dataKey="A" stroke="#2563eb" fill="#2563eb" fillOpacity={0.15} strokeWidth={2}/>
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      </div>
    </PageShell>
  );
}
