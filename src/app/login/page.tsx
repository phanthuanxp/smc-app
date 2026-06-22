'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      const data = await res.json();
      setError(data.error ?? 'Đăng nhập thất bại');
    }
  };

  return (
    <div className="h-full flex items-center justify-center p-6" style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)' }}>
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-7">
          <div className="w-11 h-11 rounded-[12px] flex items-center justify-center" style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 6px 18px rgba(79,70,229,0.35)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
              <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
            </svg>
          </div>
          <div className="leading-tight">
            <div className="text-[17px] font-extrabold text-[#0f172a]">Shop Management</div>
            <div className="text-[17px] font-extrabold text-[#4f46e5] -mt-1">Core</div>
          </div>
        </div>

        <div className="bg-white border border-[#e8edf5] rounded-[20px] p-7" style={{ boxShadow: '0 10px 40px rgba(15,23,42,0.08)' }}>
          <h1 className="text-[20px] font-bold text-[#0f172a] mb-1">Đăng nhập</h1>
          <p className="text-[13.5px] text-[#64748b] mb-6">Quản lý đa kênh bán hàng tập trung</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12.5px] font-semibold text-[#64748b] mb-1.5">Tên đăng nhập</label>
              <input
                type="text" value={email} onChange={e => setEmail(e.target.value)} required
                className="w-full h-11 px-4 bg-[#f6f8fc] border border-[#e8edf5] rounded-[11px] text-[14px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-[12.5px] font-semibold text-[#64748b] mb-1.5">Mật khẩu</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                className="w-full h-11 px-4 bg-[#f6f8fc] border border-[#e8edf5] rounded-[11px] text-[14px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
              />
            </div>

            {error && (
              <div className="p-3 bg-[#fef2f2] border border-[#fecaca] rounded-[10px] text-[13px] text-[#dc2626] font-medium">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full h-11 rounded-[11px] text-white text-[14px] font-semibold hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
            >
              {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>Đang đăng nhập...</> : 'Đăng nhập'}
            </button>
          </form>

        </div>
      </div>
    </div>
  );
}
