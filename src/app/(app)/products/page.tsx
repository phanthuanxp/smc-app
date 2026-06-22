'use client';
import { useEffect, useState, useCallback } from 'react';
import { Plus, Search, Filter, Trash2, Edit } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import StatusPill from '@/components/StatusPill';
import { ChannelBadge } from '@/components/ChannelBadge';
import PageShell from '@/components/PageShell';

const EMOJIS = ['👕','👖','🎧','🍶','🧴','👟','👗','🎒','💧','💡','🧥','💆','🍳','👠','💊','🔪','📱','🏀'];

export default function ProductsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [data, setData] = useState<any>(null);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ sku:'', name:'', category:'', price:'', cost_price:'', stock:'', weight:'' });

  const load = useCallback(() => {
    const params = new URLSearchParams({ q, category, status });
    fetch('/api/products?' + params).then(r => r.json()).then(setData);
  }, [q, category, status]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, price: Number(form.price), cost_price: Number(form.cost_price), stock: Number(form.stock), weight: Number(form.weight) }) });
    setShowModal(false);
    setForm({ sku:'', name:'', category:'', price:'', cost_price:'', stock:'', weight:'' });
    load();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Xác nhận xóa sản phẩm này?')) return;
    await fetch(`/api/products/${id}`, { method: 'DELETE' });
    load();
  };

  if (!data) return <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-[#2563eb] border-t-transparent rounded-full animate-spin"/></div>;

  const { products, total, categories } = data;

  return (
    <PageShell title="Sản phẩm gốc" subtitle={`Quản lý ${total} sản phẩm trong kho`}
      action={
        <button onClick={()=>setShowModal(true)} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
          <Plus size={15} strokeWidth={2.5}/> Thêm sản phẩm
        </button>
      }
    >
      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <div className="relative flex-1 max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]"/>
          <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Tìm kiếm sản phẩm..." className="w-full h-9 pl-9 pr-3 bg-white border border-[#e8edf5] rounded-[10px] text-[13px] outline-none focus:border-[#2563eb] transition-colors"/>
        </div>
        <div className="flex items-center gap-1.5 text-[#64748b]"><Filter size={14}/></div>
        <select value={category} onChange={e=>setCategory(e.target.value)} className="h-9 px-3 bg-white border border-[#e8edf5] rounded-[10px] text-[13px] text-[#374151] outline-none cursor-pointer">
          <option value="">Tất cả danh mục</option>
          {categories.map((c:string)=><option key={c} value={c}>{c}</option>)}
        </select>
        <select value={status} onChange={e=>setStatus(e.target.value)} className="h-9 px-3 bg-white border border-[#e8edf5] rounded-[10px] text-[13px] text-[#374151] outline-none cursor-pointer">
          <option value="">Tất cả trạng thái</option>
          <option value="active">Đang bán</option>
          <option value="inactive">Ngừng bán</option>
        </select>
      </div>

      <Card>
        <SectionHeader title={`Danh sách sản phẩm (${total})`} />
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#f0f3f8]">
                {['','Mã SP','Tên sản phẩm','Danh mục','Kênh đã đăng','Giá bán','Giá vốn','Tồn kho','Trạng thái',''].map((h,i)=>(
                  <th key={i} className="text-left text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map((p:{id:number;sku:string;name:string;category:string;channels:string;price:number;cost_price:number;stock:number;status:string}, idx:number)=>{
                const channels = p.channels ? p.channels.split(',').filter(Boolean) : [];
                const stockStatus = p.stock === 0 ? 'out_of_stock' : p.stock < 50 ? 'low_stock' : p.status;
                return (
                  <tr key={p.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="w-9 h-9 rounded-[9px] bg-gradient-to-br from-[#e0e7ff] to-[#c7d2fe] flex items-center justify-center text-[15px]">{EMOJIS[idx%EMOJIS.length]}</div>
                    </td>
                    <td className="px-3 py-2.5 text-[11.5px] text-[#94a3b8] font-mono">{p.sku}</td>
                    <td className="px-3 py-2.5 max-w-[200px]">
                      <p className="text-[13px] font-semibold text-[#0f172a] truncate">{p.name}</p>
                    </td>
                    <td className="px-3 py-2.5 text-[12.5px] text-[#64748b] whitespace-nowrap">{p.category}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 flex-wrap">
                        {channels.slice(0,3).map(ch=><ChannelBadge key={ch} channel={ch}/>)}
                        {channels.length>3&&<span className="h-5 px-1.5 bg-[#f1f5f9] text-[#64748b] text-[9.5px] font-semibold rounded-[5px] flex items-center">+{channels.length-3}</span>}
                        {channels.length===0&&<span className="text-[11px] text-[#94a3b8]">Chưa đăng</span>}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-[13px] font-semibold text-[#0f172a] whitespace-nowrap">{Number(p.price).toLocaleString('vi-VN')}đ</td>
                    <td className="px-3 py-2.5 text-[12.5px] text-[#64748b] whitespace-nowrap">{Number(p.cost_price).toLocaleString('vi-VN')}đ</td>
                    <td className={`px-3 py-2.5 text-[13px] font-bold ${p.stock===0?'text-[#dc2626]':p.stock<50?'text-[#ea580c]':'text-[#16a34a]'}`}>{p.stock}</td>
                    <td className="px-3 py-2.5"><StatusPill status={stockStatus}/></td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <button className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#eff6ff] hover:text-[#2563eb] transition-colors"><Edit size={13}/></button>
                        <button onClick={()=>handleDelete(p.id)} className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors"><Trash2 size={13}/></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e=>{if(e.target===e.currentTarget)setShowModal(false)}}>
          <div className="bg-white rounded-[20px] p-6 w-[480px] shadow-2xl">
            <h3 className="text-[17px] font-bold text-[#0f172a] mb-5">Thêm sản phẩm mới</h3>
            <div className="grid grid-cols-2 gap-3">
              {[['Mã SKU','sku'],['Tên sản phẩm','name'],['Danh mục','category'],['Giá bán','price'],['Giá vốn','cost_price'],['Tồn kho','stock'],['Trọng lượng (kg)','weight']].map(([label,field])=>(
                <div key={field} className={field==='name'?'col-span-2':''}>
                  <label className="block text-[12px] font-semibold text-[#64748b] mb-1">{label}</label>
                  <input
                    value={form[field as keyof typeof form]}
                    onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
                    type={['price','cost_price','stock','weight'].includes(field)?'number':'text'}
                    className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
                  />
                </div>
              ))}
            </div>
            <div className="flex gap-2.5 mt-5">
              <button onClick={()=>setShowModal(false)} className="flex-1 h-10 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Huỷ</button>
              <button onClick={handleAdd} className="flex-1 h-10 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity" style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>Thêm sản phẩm</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
