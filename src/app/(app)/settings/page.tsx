'use client';
import { useState } from 'react';
import { User, Bell, Shield, Palette, Globe, Database, ChevronRight, Check } from 'lucide-react';
import Card from '@/components/Card';
import PageShell from '@/components/PageShell';

const SECTIONS = [
  { icon:User,    label:'Tài khoản',      id:'account' },
  { icon:Bell,    label:'Thông báo',      id:'notifications' },
  { icon:Shield,  label:'Bảo mật',        id:'security' },
  { icon:Palette, label:'Giao diện',      id:'appearance' },
  { icon:Globe,   label:'Kết nối kênh',   id:'channels' },
  { icon:Database,label:'Dữ liệu & Sao lưu', id:'data' },
];

export default function SettingsPage() {
  const [section, setSection] = useState('account');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name:'Admin', email:'admin@shopcore.vn', phone:'0901234567', language:'vi', timezone:'Asia/Ho_Chi_Minh' });

  const handleSave = async () => {
    await new Promise(r=>setTimeout(r,800));
    setSaved(true);
    setTimeout(()=>setSaved(false),2500);
  };

  return (
    <PageShell title="Cài đặt hệ thống" subtitle="Quản lý tài khoản, thông báo và cấu hình kênh bán hàng">
      <div className="grid gap-5" style={{gridTemplateColumns:'220px 1fr'}}>
        {/* Sidebar nav */}
        <div className="space-y-1">
          {SECTIONS.map(s=>{
            const Icon=s.icon;
            return (
              <button key={s.id} onClick={()=>setSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-left transition-all ${section===s.id?'bg-[#eff6ff] text-[#2563eb] font-semibold':'text-[#475569] hover:bg-[#f6f8fc]'}`}>
                <Icon size={16} className={section===s.id?'text-[#2563eb]':'text-[#94a3b8]'}/>
                <span className="text-[13.5px]">{s.label}</span>
                <ChevronRight size={13} className={`ml-auto ${section===s.id?'text-[#2563eb]':'text-[#cbd5e1]'}`}/>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {section==='account' && (
            <Card padding="p-6">
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-5">Thông tin tài khoản</h3>
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[#f0f3f8]">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[24px] font-bold" style={{background:'linear-gradient(135deg,#2563eb,#7c3aed)'}}>A</div>
                <div>
                  <p className="text-[15px] font-bold text-[#0f172a]">{form.name}</p>
                  <p className="text-[13px] text-[#64748b]">Quản trị viên</p>
                  <button className="mt-1.5 text-[12.5px] font-semibold text-[#2563eb] hover:opacity-70 transition-opacity">Đổi ảnh đại diện</button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Họ và tên','name','text'],['Email','email','email'],['Số điện thoại','phone','tel'],['Ngôn ngữ','language','select'],['Múi giờ','timezone','select']].map(([label,field,type])=>(
                  <div key={field} className={field==='timezone'?'col-span-2':''}>
                    <label className="block text-[12px] font-semibold text-[#64748b] mb-1.5">{label}</label>
                    {type==='select' ? (
                      <select value={form[field as keyof typeof form]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
                        className="w-full h-10 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[10px] text-[13.5px] outline-none focus:border-[#2563eb] cursor-pointer">
                        {field==='language'?<><option value="vi">Tiếng Việt</option><option value="en">English</option></>:<><option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option><option value="Asia/Bangkok">Bangkok (GMT+7)</option></>}
                      </select>
                    ) : (
                      <input type={type} value={form[field as keyof typeof form]} onChange={e=>setForm(f=>({...f,[field]:e.target.value}))}
                        className="w-full h-10 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[10px] text-[13.5px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"/>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity"
                  style={{background:'linear-gradient(135deg,#2563eb,#4f46e5)'}}>
                  {saved?<><Check size={15}/>Đã lưu!</>:'Lưu thay đổi'}
                </button>
                <button className="px-5 py-2.5 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Huỷ</button>
              </div>
            </Card>
          )}

          {section==='notifications' && (
            <Card padding="p-6">
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-5">Cài đặt thông báo</h3>
              <div className="space-y-4">
                {[['Đơn hàng mới','Nhận thông báo khi có đơn hàng mới',true],['Sản phẩm sắp hết hàng','Cảnh báo khi tồn kho xuống dưới ngưỡng',true],['Lỗi đồng bộ','Thông báo khi listing bị lỗi hoặc bị từ chối',true],['Báo cáo hàng ngày','Gửi báo cáo tổng hợp mỗi ngày lúc 8h sáng',false],['Xu hướng thị trường','Cập nhật xu hướng từ khóa hàng tuần',false]].map(([label,desc,def],i)=>{
                  const [on,setOn]=useState(!!def);
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-[12px]">
                      <div>
                        <p className="text-[13.5px] font-semibold text-[#0f172a]">{label as string}</p>
                        <p className="text-[12px] text-[#64748b] mt-0.5">{desc as string}</p>
                      </div>
                      <button onClick={()=>setOn(!on)} className={`relative w-10 h-6 rounded-full transition-colors ${on?'bg-[#2563eb]':'bg-[#e2e8f0]'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on?'translate-x-4':'translate-x-0.5'}`}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {(section==='security'||section==='appearance'||section==='channels'||section==='data') && (
            <Card padding="p-10" className="flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-14 h-14 rounded-[16px] bg-[#f1f5f9] flex items-center justify-center mb-4">
                {(() => { const S = SECTIONS.find(s=>s.id===section); const Icon = S?.icon ?? User; return <Icon size={24} className="text-[#94a3b8]"/>; })()}
              </div>
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-2">{SECTIONS.find(s=>s.id===section)?.label}</h3>
              <p className="text-[13.5px] text-[#64748b]">Tính năng đang được phát triển trong phiên bản tiếp theo</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
