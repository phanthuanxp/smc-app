'use client';
import { useEffect, useState, useCallback } from 'react';
import { UserPlus, Trash2, ShieldCheck } from 'lucide-react';
import Card, { SectionHeader } from '@/components/Card';
import PageShell from '@/components/PageShell';
import { ROLE_LABELS, Role, normalizeRole } from '@/lib/permissions';

interface Member { id: number; email: string; name: string; role: string; status: string; created_at: string; }
const ROLES: Role[] = ['owner', 'manager', 'staff', 'accountant'];
const ROLE_PILL: Record<Role, { bg: string; color: string }> = {
  owner:      { bg: '#f5f3ff', color: '#7c3aed' },
  manager:    { bg: '#eff6ff', color: '#2563eb' },
  staff:      { bg: '#f0fdf4', color: '#16a34a' },
  accountant: { bg: '#fff7ed', color: '#ea580c' },
};

export default function TeamPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [me, setMe] = useState<{ id: number; role: Role } | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'staff' as Role, password: '' });
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(() => {
    fetch('/api/users').then(r => r.json()).then(d => { setMembers(d.users ?? []); setMe(d.me ?? null); });
  }, []);
  useEffect(() => { load(); }, [load]);

  const isOwner = me ? normalizeRole(me.role) === 'owner' : false;

  const handleInvite = async () => {
    setError('');
    const res = await fetch('/api/users', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (res.ok) {
      setShowModal(false);
      setNotice(`Đã thêm ${form.name}. Mật khẩu đăng nhập tạm: ${data.initialPassword}`);
      setForm({ name: '', email: '', role: 'staff', password: '' });
      load();
    } else {
      setError(data.error ?? 'Không thêm được thành viên');
    }
  };

  const changeRole = async (id: number, role: string) => {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ role }) });
    load();
  };
  const toggleStatus = async (id: number, status: string) => {
    await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: status === 'active' ? 'inactive' : 'active' }) });
    load();
  };
  const remove = async (id: number) => {
    if (!confirm('Xoá thành viên này?')) return;
    await fetch(`/api/users/${id}`, { method: 'DELETE' });
    load();
  };

  return (
    <PageShell
      title="Quản lý nhóm"
      subtitle="Mời thành viên, phân vai trò và quản lý quyền truy cập"
      action={
        isOwner ? (
          <button onClick={() => { setShowModal(true); setNotice(''); }} className="flex items-center gap-2 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity" style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
            <UserPlus size={15} strokeWidth={2.2} /> Mời thành viên
          </button>
        ) : null
      }
    >
      {notice && (
        <div className="mb-4 p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] text-[13px] text-[#16a34a] font-medium flex items-center gap-2">
          <ShieldCheck size={15} /> {notice}
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-4 gap-3.5 mb-6">
        {ROLES.map(r => (
          <div key={r} className="bg-white border border-[#e8edf5] rounded-[14px] p-4" style={{ boxShadow: '0 2px 8px rgba(15,23,42,0.04)' }}>
            <span className="inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold mb-2" style={{ background: ROLE_PILL[r].bg, color: ROLE_PILL[r].color }}>{ROLE_LABELS[r]}</span>
            <p className="text-[11.5px] text-[#64748b] leading-snug">
              {r === 'owner' && 'Toàn quyền, quản lý nhóm & cài đặt.'}
              {r === 'manager' && 'Vận hành đầy đủ, không quản lý nhóm.'}
              {r === 'staff' && 'Sản phẩm, đơn hàng, tồn kho, đăng kênh.'}
              {r === 'accountant' && 'Xem đơn hàng, báo cáo, thị trường.'}
            </p>
          </div>
        ))}
      </div>

      <Card>
        <SectionHeader title={`Thành viên (${members.length})`} />
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#f0f3f8]">
              {['Thành viên', 'Email', 'Vai trò', 'Trạng thái', 'Ngày tham gia', ''].map((h, i) => (
                <th key={i} className="text-left text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wider px-3 py-2.5 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {members.map(m => {
              const role = normalizeRole(m.role);
              const isMe = me?.id === m.id;
              return (
                <tr key={m.id} className="border-b border-[#f8fafc] hover:bg-[#f8fafc] transition-colors">
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>{m.name.charAt(0).toUpperCase()}</div>
                      <span className="text-[13px] font-semibold text-[#0f172a]">{m.name}{isMe && <span className="text-[11px] text-[#94a3b8] font-normal"> (bạn)</span>}</span>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-[#64748b]">{m.email}</td>
                  <td className="px-3 py-3">
                    {isOwner && !isMe ? (
                      <select value={role} onChange={e => changeRole(m.id, e.target.value)} className="text-[12px] border border-[#e8edf5] rounded-[7px] px-2 py-1 bg-white outline-none cursor-pointer">
                        {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    ) : (
                      <span className="inline-flex px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold" style={{ background: ROLE_PILL[role].bg, color: ROLE_PILL[role].color }}>{ROLE_LABELS[role]}</span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold" style={m.status === 'active' ? { background: '#dcfce7', color: '#16a34a' } : { background: '#f1f5f9', color: '#64748b' }}>
                      {m.status === 'active' ? 'Hoạt động' : 'Vô hiệu hoá'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-[12px] text-[#64748b]">{m.created_at?.slice(0, 10)}</td>
                  <td className="px-3 py-3">
                    {isOwner && !isMe && (
                      <div className="flex items-center gap-2">
                        <button onClick={() => toggleStatus(m.id, m.status)} className="text-[12px] text-[#64748b] font-medium hover:text-[#2563eb] transition-colors">
                          {m.status === 'active' ? 'Vô hiệu' : 'Kích hoạt'}
                        </button>
                        <button onClick={() => remove(m.id)} className="w-7 h-7 flex items-center justify-center rounded-[6px] text-[#64748b] hover:bg-[#fef2f2] hover:text-[#dc2626] transition-colors"><Trash2 size={13} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {!isOwner && (
          <p className="text-[12.5px] text-[#94a3b8] mt-4 pt-4 border-t border-[#f0f3f8]">Chỉ chủ shop mới có quyền mời và phân quyền thành viên.</p>
        )}
      </Card>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-[20px] p-6 w-[440px] shadow-2xl">
            <h3 className="text-[17px] font-bold text-[#0f172a] mb-5">Mời thành viên mới</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1">Họ tên</label>
                <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb]" />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1">Vai trò</label>
                <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))} className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none cursor-pointer">
                  {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-[#64748b] mb-1">Mật khẩu tạm (≥6 ký tự, bỏ trống = mặc định)</label>
                <input value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} className="w-full h-9 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[9px] text-[13px] outline-none focus:border-[#2563eb]" />
              </div>
            </div>
            {error && <div className="mt-3 p-2.5 bg-[#fef2f2] border border-[#fecaca] rounded-[8px] text-[12.5px] text-[#dc2626]">{error}</div>}
            <div className="flex gap-2.5 mt-5">
              <button onClick={() => setShowModal(false)} className="flex-1 h-10 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc]">Huỷ</button>
              <button onClick={handleInvite} className="flex-1 h-10 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85" style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>Thêm thành viên</button>
            </div>
          </div>
        </div>
      )}
    </PageShell>
  );
}
