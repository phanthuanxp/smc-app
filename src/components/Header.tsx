'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Calendar, Bell, Plus, ChevronDown, LogOut, Sun, Moon } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface HeaderProps {
  user?: { name: string; email: string; role: string };
}

export default function Header({ user }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, toggle } = useTheme();
  const router = useRouter();
  const displayName = user?.name ?? 'Admin';
  const roleLabel = user?.role === 'owner' ? 'Quản trị viên' : (user?.role ?? 'Người dùng');
  const initial = displayName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  };

  return (
    <header
      className="h-16 min-h-16 border-b flex items-center px-7 gap-3 z-10 transition-colors"
      style={{ background: 'var(--smc-surface)', borderColor: 'var(--smc-border)' }}
    >
      {/* Search */}
      <div className="relative w-[360px] flex-shrink-0">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--smc-text-4)' }}/>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Tìm kiếm sản phẩm, đơn hàng, shop..."
          className="w-full h-9 pl-9 pr-14 rounded-[10px] text-[13.5px] outline-none transition-colors"
          style={{
            background: 'var(--smc-input-bg)',
            border: '1px solid var(--smc-border)',
            color: 'var(--smc-text)',
          }}
        />
        <kbd
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-[5px] px-1.5 py-0.5 text-[11px]"
          style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text-4)' }}
        >⌘K</kbd>
      </div>

      {/* Spacer — pushes everything else to the right */}
      <div className="flex-1"/>

      {/* Date range */}
      <button
        className="flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-[13px] font-medium whitespace-nowrap transition-colors"
        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)', color: 'var(--smc-text-2)' }}
      >
        <Calendar size={14} style={{ color: 'var(--smc-text-3)' }}/>
        20/05/2025 – 26/05/2025
        <ChevronDown size={13} style={{ color: 'var(--smc-text-4)' }}/>
      </button>

      {/* Notification */}
      <button
        className="relative w-9 h-9 rounded-[10px] flex items-center justify-center transition-colors"
        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}
      >
        <Bell size={16} style={{ color: 'var(--smc-text-3)' }}/>
        <span className="absolute -top-1.5 -right-1.5 bg-[#ef4444] text-white text-[9.5px] font-bold rounded-full px-1.5 py-0.5 border-2 leading-none" style={{ borderColor: 'var(--smc-surface)' }}>12</span>
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        title={theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
        className="w-9 h-9 rounded-[10px] flex items-center justify-center transition-all hover:scale-105"
        style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}
      >
        {theme === 'dark'
          ? <Sun size={16} className="text-[#f59e0b]"/>
          : <Moon size={16} style={{ color: 'var(--smc-text-3)' }}/>
        }
      </button>

      {/* Add button */}
      <button
        className="flex items-center gap-1.5 px-4 py-2 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity cursor-pointer"
        style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
      >
        <Plus size={15} strokeWidth={2.5}/>
        Thêm nhanh
      </button>

      {/* User */}
      <div className="relative">
        <button
          onClick={() => setMenuOpen(o => !o)}
          className="flex items-center gap-2.5 px-2 py-1.5 rounded-[10px] transition-colors cursor-pointer"
          style={{ background: menuOpen ? 'var(--smc-surface-2)' : 'transparent' }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--smc-surface-2)')}
          onMouseLeave={e => { if (!menuOpen) e.currentTarget.style.background = 'transparent'; }}
        >
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[13px] font-bold flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}
          >
            {initial}
          </div>
          <div className="text-left">
            <div className="text-[13px] font-semibold leading-tight" style={{ color: 'var(--smc-text)' }}>{displayName}</div>
            <div className="text-[11px] leading-tight" style={{ color: 'var(--smc-text-4)' }}>{roleLabel}</div>
          </div>
          <ChevronDown size={13} style={{ color: 'var(--smc-text-4)' }}/>
        </button>

        {menuOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)}/>
            <div
              className="absolute right-0 top-12 w-56 rounded-[12px] shadow-lg z-20 p-1.5"
              style={{ background: 'var(--smc-surface)', border: '1px solid var(--smc-border)' }}
            >
              <div className="px-3 py-2 mb-1" style={{ borderBottom: '1px solid var(--smc-border-2)' }}>
                <div className="text-[13px] font-semibold" style={{ color: 'var(--smc-text)' }}>{displayName}</div>
                <div className="text-[11.5px]" style={{ color: 'var(--smc-text-4)' }}>{user?.email}</div>
              </div>
              {/* Toggle inside dropdown too */}
              <button
                onClick={toggle}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium transition-colors"
                style={{ color: 'var(--smc-text-2)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--smc-surface-2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {theme === 'dark' ? <Sun size={15} className="text-[#f59e0b]"/> : <Moon size={15} style={{ color: 'var(--smc-text-3)' }}/>}
                {theme === 'dark' ? 'Chế độ sáng' : 'Chế độ tối'}
              </button>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-[8px] text-[13px] font-medium text-[#dc2626] transition-colors"
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <LogOut size={15}/> Đăng xuất
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
