'use client';
import { useEffect, useState, useCallback } from 'react';
import { Package, AlertTriangle, XCircle, CheckCircle, Plus, RefreshCw, Zap } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import PageShell from '@/components/PageShell';

interface Sched { enabled: boolean; intervalMinutes: number; lastRunAt: string|null; nextRunAt: string|null; lastResult: {success:number;error:number}|null; running: boolean; }

export default function InventoryPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ product_id:'', type:'in', quantity:'', note:'' });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [syncData, setSyncData] = useState<{ logs:any[]; summary:{success:number;error:number}; scheduler:Sched }|null>(null);
  const [syncing, setSyncing] = useState(false);
  const [sellingId, setSellingId] = useState<number|null>(null);

  const load = useCallback(() => fetch(`/api/inventory?filter=${filter}`).then(r=>r.json()).then(setData), [filter]);
  const loadSync = useCallback(() => fetch('/api/channels/logs').then(r=>r.json()).then(setSyncData), []);
  useEffect(()=>{ load(); }, [load]);
  useEffect(()=>{ loadSync(); }, [loadSync]);

  const handleLog = async () => {
    await fetch('/api/inventory', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({...form,quantity:Number(form.quantity)}) });
    setShowModal(false);
    setForm({product_id:'',type:'in',quantity:'',note:''});
    load();
  };

  const syncNow = async () => {
    setSyncing(true);
    await fetch('/api/channels/scheduler', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action:'run'}) });
    await Promise.all([load(), loadSync()]);
    setSyncing(false);
  };

  const toggleAuto = async () => {
    const action = syncData?.scheduler.enabled ? 'stop' : 'start';
    await fetch('/api/channels/scheduler', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({action}) });
    loadSync();
  };

  // Demo anti-oversell: record a sale of 1 unit → deducts master stock and
  // pushes the new level to every channel.
  const sellOne = async (productId: number) => {
    setSellingId(productId);
    await fetch('/api/inventory/sell', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({productId, qty:1}) });
    await Promise.all([load(), loadSync()]);
    setSellingId(null);
  };

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/></div>;

  const { products, stats, logs } = data;
  const sched = syncData?.scheduler;

  const KPIs = [
    { icon: Package,       bg:'#eff6ff', color:'#2563eb', label:'Tổng SKU',        value:stats.total },
    { icon: CheckCircle,   bg:'#f0fdf4', color:'#16a34a', label:'Tồn kho ổn định', value:stats.ok },
    { icon: AlertTriangle, bg:'#fff7ed', color:'#ea580c', label:'Sắp hết hàng',    value:stats.low },
    { icon: XCircle,       bg:'#fef2f2', color:'#dc2626', label:'Hết hàng',        value:stats.out },
  ];

  return (
    <PageShell title="Quản lý tồn kho" subtitle="Theo dõi số lượng hàng hóa và lịch sử nhập/xuất"
      action={
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
          <Plus size={15} strokeWidth={2.5}/> Nhập/Xuất kho
        </button>
      }
    >
      {/* KPI */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {KPIs.map((k,i)=>{const Icon=k.icon;return(
          <div key={i} className="bg-white border border-[#e8edf5] rounded-[18px] p-4" style={{boxShadow:'0 2px 8px rgba(15,23,42,0.04)'}}>
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center mb-3" style={{background:k.bg}}>
              <Icon size={18} style={{color:k.color}} strokeWidth={1.8}/>
            </div>
            <p className="text-[11.5px] text-[#64748b] font-medium mb-1">{k.label}</p>
            <p className="text-[24px] font-extrabold text-[#0f172a] tracking-tight">{k.value}</p>
          </div>
        );})}
      </div>

      {/* Sync status bar */}
      <Card className="mb-6" padding="p-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-[11px] flex items-center justify-center" style={{background: sched?.enabled ? '#f0fdf4' : '#f1f5f9'}}>
              <RefreshCw size={18} className={`${sched?.enabled ? 'text-[#16a34a]' : 'text-[#94a3b8]'} ${syncing ? 'animate-spin' : ''}`} />
            </div>
            <div>
              <div className="text-[14px] font-bold text-[#0f172a]">Đồng bộ đa kênh {sched?.enabled && <span className="text-[11px] font-semibold text-[#16a34a]">● Tự động bật</span>}</div>
              <div className="text-[12px] text-[#64748b]">
                {sched?.lastRunAt ? `Lần cuối: ${new Date(sched.lastRunAt).toLocaleString('vi-VN')}` : 'Chưa đồng bộ'}
                {sched?.lastResult && ` · ${sched.lastResult.success} OK / ${sched.lastResult.error} lỗi`}
                {' · chu kỳ ' + (sched?.intervalMinutes ?? 10) + ' phút'}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={toggleAuto} className={`px-3.5 py-2 rounded-[10px] text-[13px] font-semibold border transition-colors ${sched?.enabled ? 'border-[#fecaca] text-[#dc2626] hover:bg-[#fef2f2]' : 'border-[#e8edf5] text-[#475569] hover:border-[#2563eb] hover:text-[#2563eb]'}`}>
              {sched?.enabled ? 'Tắt tự động' : 'Bật tự động'}
            </button>
            <button onClick={syncNow} disabled={syncing} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13px] font-semibold hover:opacity-85 disabled:opacity-60 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
              <RefreshCw size={14} className={syncing ? 'animate-spin' : ''}/> {syncing ? 'Đang đồng bộ...' : 'Đồng bộ ngay'}
            </button>
          </div>
        </div>
      </Card>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {[['all','Tất cả'],['low','Sắp hết hàng'],['out','Hết hàng']].map(([val,label])=>(
          <button key={val} onClick={()=>setFilter(val)}
            className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${filter===val?'bg-[#2563eb] text-white':'bg-white border border-[#e8edf5] text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb]'}`}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid gap-4" style={{gridTemplateColumns:'1fr 340px'}}>
        {/* Product list */}
        <Card>
          <SectionHeader title="Danh sách tồn kho" />
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f3f8]">
                {['Mã SP','Tên sản phẩm','Danh mục','Tồn kho','Trạng thái','Chống oversell'].map((h,i)=>(
                  <th key={i} className="text-left text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p:{id:number;sku:string;name:string;category:string;stock:number})=>(
                <tr key={p.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-3 py-2.5 font-mono text-[11.5px] text-[#94a3b8]">{p.sku}</td>
                  <td className="px-3 py-2.5 text-[13px] font-semibold text-[#0f172a]">{p.name}</td>
                  <td className="px-3 py-2.5 text-[12.5px] text-[#64748b]">{p.category}</td>
                  <td className={`px-3 py-2.5 text-[15px] font-extrabold ${p.stock===0?'text-[#dc2626]':p.stock<50?'text-[#ea580c]':'text-[#16a34a]'}`}>{p.stock}</td>
                  <td className="px-3 py-2.5">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold"
                      style={p.stock===0?{background:'#fef2f2',color:'#dc2626'}:p.stock<50?{background:'#fff7ed',color:'#ea580c'}:{background:'#dcfce7',color:'#16a34a'}}>
                      {p.stock===0?'Hết hàng':p.stock<50?'Sắp hết':'Còn hàng'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <button onClick={()=>sellOne(p.id)} disabled={sellingId===p.id || p.stock===0}
                      title="Ghi nhận bán 1 — tự trừ kho mọi kênh"
                      className="flex items-center gap-1 text-[12px] font-semibold text-[#2563eb] hover:opacity-70 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity">
                      <Zap size={12} className={sellingId===p.id?'animate-pulse':''}/> Bán 1
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Side column: inventory + sync logs */}
        <div className="space-y-4">
          <Card>
            <SectionHeader title="Lịch sử nhập/xuất kho" />
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
              {logs.map((l:{id:number;type:string;quantity:number;note:string;created_at:string;product_name:string;sku:string})=>(
                <div key={l.id} className="flex items-start gap-3 py-2.5 border-b border-[#f0f3f8] last:border-0">
                  <div className={`w-7 h-7 rounded-[8px] flex items-center justify-center text-[11px] font-bold flex-shrink-0 ${l.type==='in'?'bg-[#dcfce7] text-[#16a34a]':l.type==='out'?'bg-[#fef2f2] text-[#dc2626]':'bg-[#eff6ff] text-[#2563eb]'}`}>
                    {l.type==='in'?'IN':l.type==='out'?'OUT':'ADJ'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12.5px] font-semibold text-[#0f172a] truncate">{l.product_name}</p>
                    <p className="text-[11px] text-[#94a3b8]">{l.note || l.sku}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-[13px] font-bold ${l.type==='in'?'text-[#16a34a]':'text-[#dc2626]'}`}>
                      {l.type==='in'?'+':l.type==='out'?'-':''}{l.quantity}
                    </p>
                    <p className="text-[10.5px] text-[#94a3b8]">{l.created_at.slice(5,16).replace('T',' ')}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <SectionHeader
              title="Nhật ký đồng bộ kênh"
              action={syncData ? <span className="text-[11.5px] text-[#64748b]"><span className="text-[#16a34a] font-semibold">{syncData.summary.success} OK</span> · <span className="text-[#dc2626] font-semibold">{syncData.summary.error} lỗi</span></span> : null}
            />
            <div className="space-y-0.5 max-h-[280px] overflow-y-auto">
              {(syncData?.logs ?? []).length === 0 && (
                <p className="text-[12px] text-[#94a3b8] py-4 text-center">Chưa có hoạt động đồng bộ. Bấm &quot;Đồng bộ ngay&quot; hoặc &quot;Bán 1&quot;.</p>
              )}
              {(syncData?.logs ?? []).map((l:{id:number;type:string;channel:string;shop_name:string;sku:string;status:string;message:string;created_at:string})=>{
                const tag = l.type==='pull'?'PULL':l.type==='stock_push'?'PUSH':'SALE';
                const ok = l.status==='success';
                return (
                  <div key={l.id} className="flex items-start gap-3 py-2 border-b border-[#f0f3f8] last:border-0">
                    <div className={`px-1.5 h-5 rounded-[5px] flex items-center text-[9.5px] font-bold flex-shrink-0 ${ok?'bg-[#eff6ff] text-[#2563eb]':'bg-[#fef2f2] text-[#dc2626]'}`}>{tag}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] text-[#374151] leading-snug">{l.message}</p>
                      <p className="text-[10.5px] text-[#94a3b8]">{[l.shop_name, l.sku].filter(Boolean).join(' · ')} {l.created_at?.slice(11,16)}</p>
                    </div>
                    {ok ? <CheckCircle size={13} className="text-[#16a34a] flex-shrink-0 mt-0.5"/> : <XCircle size={13} className="text-[#dc2626] flex-shrink-0 mt-0.5"/>}
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="bg-white rounded-[20px] p-6 w-[420px] shadow-2xl">
            <h3 className="text-[17px] font-bold text-[#0f172a] mb-5">Nhập/Xuất kho</h3>
            <div className="space-y-3">
              {[['ID sản phẩm','product_id','text'],['Số lượng','quantity','number'],['Ghi chú','note','text']].map(([label,field,type])=>(
                <div key={field}>
                  <label className="block text-[12px] font-semibold text-[#64748b] mb-1">{label}</label>
                  <input value={form[field as keyof typeof form]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))} type={type}
                    className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] transition-colors"/>
                </div>
              ))}
              <div>
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1">Loại</label>
                <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}
                  className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none cursor-pointer">
                  <option value="in">Nhập kho</option><option value="out">Xuất kho</option><option value="adjust">Điều chỉnh</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={()=>setShowModal(false)} className="flex-1 h-10 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Huỷ</button>
              <button onClick={handleLog} className="flex-1 h-10 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>Xác nhận</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
