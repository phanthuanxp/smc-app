'use client';
import { useEffect, useState, useCallback } from 'react';
import { Search, Filter } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import StatusPill from '@/components/StatusPill';
import { ChannelBadge } from '@/components/ChannelBadge';
import PageShell from '@/components/PageShell';

const STATUSES = ['','new','processing','completed','cancelled','error'];
const LABELS: Record<string, string> = { '':'Tất cả', new:'Mới', processing:'Đang xử lý', completed:'Hoàn tất', cancelled:'Đã huỷ', error:'Lỗi đồng bộ' };

export default function OrdersPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const load = useCallback(() => {
    const params = new URLSearchParams({ q, status, page: String(page) });
    fetch('/api/orders?' + params).then(r => r.json()).then(setData);
  }, [q, status, page]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id: number, newStatus: string) => {
    await fetch(`/api/orders/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({status:newStatus}) });
    load();
  };

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/></div>;

  const { orders, total } = data;

  return (
    <PageShell title="Đơn hàng" subtitle={`Tổng ${total} đơn hàng từ tất cả kênh`}>
      {/* Status tabs */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {STATUSES.map(s=>(
          <button key={s} onClick={()=>{setStatus(s);setPage(1);}}
            className={`px-4 py-2 rounded-[10px] text-[13px] font-semibold transition-all ${status===s?'bg-[#2563eb] text-white shadow-sm':'bg-white border border-[#e8edf5] text-[#64748b] hover:border-[#2563eb] hover:text-[#2563eb]'}`}>
            {LABELS[s]}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm mã đơn, tên khách..." className="w-full h-9 pl-9 pr-3 bg-white border border-[#e8edf5] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] transition-colors"/>
        </div>
        <div className="flex items-center gap-1.5 text-[12.5px] text-[#64748b]"><Filter size={13}/> Lọc nâng cao</div>
      </div>

      <Card>
        <SectionHeader title={`Danh sách đơn hàng (${total})`} />
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f3f8]">
              {['Mã đơn','Khách hàng','Kênh','Tổng tiền','Phí vận chuyển','Trạng thái','Ngày đặt','Thao tác'].map((h,i)=>(
                <th key={i} className="text-left text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {orders.map((o:{id:number;order_no:string;customer_name:string;customer_phone:string;channel:string;total:number;shipping_fee:number;status:string;created_at:string})=>(
              <tr key={o.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                <td className="px-3 py-3 font-mono text-[12.5px] font-semibold text-[#0f172a]">#{o.order_no}</td>
                <td className="px-3 py-3">
                  <div className="text-[13px] font-semibold text-[#0f172a]">{o.customer_name}</div>
                  <div className="text-[11.5px] text-[#94a3b8]">{o.customer_phone}</div>
                </td>
                <td className="px-3 py-3"><ChannelBadge channel={o.channel}/></td>
                <td className="px-3 py-3 text-[13px] font-semibold text-[#0f172a] whitespace-nowrap">{Number(o.total).toLocaleString('vi-VN')}đ</td>
                <td className="px-3 py-3 text-[13px] text-[#64748b] whitespace-nowrap">{Number(o.shipping_fee).toLocaleString('vi-VN')}đ</td>
                <td className="px-3 py-3"><StatusPill status={o.status}/></td>
                <td className="px-3 py-3 text-[12px] text-[#64748b] whitespace-nowrap">{o.created_at.slice(0,16).replace('T',' ')}</td>
                <td className="px-3 py-3">
                  <select
                    value={o.status}
                    onChange={e=>updateStatus(o.id,e.target.value)}
                    className="text-[12px] border border-[#e8edf5] rounded-[7px] px-2 py-1 bg-white outline-none cursor-pointer text-[#374151]"
                  >
                    {['new','processing','completed','cancelled','error'].map(s=>(
                      <option key={s} value={s}>{LABELS[s]}</option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#f0f3f8]">
          <span className="text-[12.5px] text-[#64748b]">Hiển thị {Math.min(20,(page-1)*20+orders.length)} / {total} đơn hàng</span>
          <div className="flex gap-2">
            <button disabled={page===1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 text-[12.5px] font-semibold border border-[#e8edf5] rounded-[8px] hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">← Trước</button>
            <button disabled={page*20>=total} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 text-[12.5px] font-semibold border border-[#e8edf5] rounded-[8px] hover:border-[#2563eb] hover:text-[#2563eb] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">Sau →</button>
          </div>
        </div>
      </Card>
    </PageShell>
  );
}
