'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Bell, Plus, ChevronDown, LogOut } from 'lucide-react';

interface HeaderProps {
  user?: { name: string; email: string; role: string };
}

export default function Header({ user }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const displayName = user?.name ?? 'Admin';
  const roleLabel = user?.role === 'admin' ? 'Quản trị viên' : (user?.role ?? 'Người dùng');
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header className="h-16 min-h-16 bg-white border-b border-[#e8edf5] flex items-center px-7 gap-3 z-10">
      {/* Search */}
      <div className="relative flex-1 max-w-[420px]">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8]" />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm kiếm sản phẩm, đơn hàng, shop..."
          className="w-full h-9 pl-9 pr-14 bg-[#f6f8fc] border border-[#e8edf5] rounded-[10px] text-[13.5px] text-[#0f172a] placeholder:text-[#94a3b8] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"
        />
        <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-white border border-[#e2e8f0] rounded-[5px] px-1.5 py-0.5 text-[11px] text-[#94a3b8]">⌘K</kbd>
      </div>

      {/* Date range */}
      <button className="flex items-center gap-2 px-3.5 py-2 bg-white border border-[#e8edf5] rounded-[10px] text-[13px] text-[#374151] font-medium whitespace-nowrap hover:border-[#2563eb] transition-colors">
        <Calendar size={14} className="text-[#64748b]" />
        20/05/2025 – 26/05/2025
        <ChevronDown size={13} className="text-[#94a3b8]" />
      </button>

      {/* Notification */}
      <button className="relative w-9 h-9 bg-white border border-[#e8edf5] rounded-[10px] flex items-center justify-center hover:border-[#2563eb] transition-colors">
        <Bell size={16} className="text-[#64748b]" />
        <span className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-white text-[9.5px] font-bold rounded-full px-1.5 py-0.5 border-2 border-white leading-none">12</span>
      </button>

      {/* Add button */}
      <button
        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity cursor-pointer"
        style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
      >
        <Plus size={15} strokeWidth={2.5} />
        Thêm nhanh
      </button>

      {/* User */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] hover:bg-[#f6f8fc] transition-colors cursor-pointer"
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
          >
            {initial}
          </div>
          <div className="text-left">
            <div className="text-[13px] font-semibold text-[#0f172a] leading-tight">{displayName}</div>
            <div className="text-[11px] text-[#94a3b8] leading-tight">{roleLabel}</div>
          </div>
          <ChevronDown size={13} className="text-[#94a3b8]" />
        </button>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
            <div className="absolute right-0 top-12 w-56 bg-white border border-[#e8edf5] rounded-[12px] shadow-lg z-20 p-1.5">
              <div className="px-3 py-2 border-b border-[#f0f3f8] mb-1">
                <div className="text-[13px] font-semibold text-[#0f172a]">{displayName}</div>
                <div className="text-[11.5px] text-[#94a3b8]">{user?.email}</div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#dc2626] hover:bg-[#fef2f2] transition-colors"
              >
                <LogOut size={15} /> Đăng xuất
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
