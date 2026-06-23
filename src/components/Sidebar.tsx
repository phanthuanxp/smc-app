'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Tag, Share2,
  Package, ShoppingCart, BarChart3, FileText, Settings, Star, Users, Plus
} from 'lucide-react';
import { canAccess, ModuleId } from '@/lib/permissions';

// TikTok icon
function TikTokIcon({ size = 17, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.73a4.85 4.85 0 0 1-1.01-.04z"/>
    </svg>
  );
}

// Shopee icon
function ShopeeIcon({ size = 17, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M12 2C9.243 2 7 4.243 7 7H5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-2c0-2.757-2.243-5-5-5zm0 2a3 3 0 0 1 3 3H9a3 3 0 0 1 3-3zm0 8a2 2 0 1 1 0 4 2 2 0 0 1 0-4z"/>
    </svg>
  );
}

type NavSection = {
  label?: string;
  items: { href: string; icon: React.ReactNode; label: string; module: ModuleId; sub?: string }[];
};

export default function Sidebar({ role = 'owner' }: { role?: string }) {
  const pathname = usePathname();

  const sections: NavSection[] = [
    {
      items: [
        { href: '/', icon: <LayoutDashboard size={17} strokeWidth={1.8}/>, label: 'Tổng quan', module: 'dashboard' },
      ],
    },
    {
      label: 'CÁC SÀN',
      items: [
        { href: '/tiktok', icon: <TikTokIcon size={16}/>, label: 'TikTok Shop', module: 'tiktok', sub: 'tiktok' },
        { href: '/shopee', icon: <ShopeeIcon size={16}/>, label: 'Shopee', module: 'shopee', sub: 'shopee' },
      ],
    },
    {
      label: 'QUẢN LÝ',
      items: [
        { href: '/products', icon: <Tag size={17} strokeWidth={1.8}/>, label: 'All Sản Phẩm', module: 'products' },
        { href: '/multichannel', icon: <Share2 size={17} strokeWidth={1.8}/>, label: 'Đăng đa kênh', module: 'multichannel' },
        { href: '/inventory', icon: <Package size={17} strokeWidth={1.8}/>, label: 'Tồn kho', module: 'inventory' },
        { href: '/orders', icon: <ShoppingCart size={17} strokeWidth={1.8}/>, label: 'Đơn hàng', module: 'orders' },
      ],
    },
    {
      label: 'PHÂN TÍCH',
      items: [
        { href: '/market', icon: <BarChart3 size={17} strokeWidth={1.8}/>, label: 'Phân tích thị trường', module: 'market' },
        { href: '/reports', icon: <FileText size={17} strokeWidth={1.8}/>, label: 'Báo cáo', module: 'reports' },
      ],
    },
    {
      label: 'HỆ THỐNG',
      items: [
        { href: '/team', icon: <Users size={17} strokeWidth={1.8}/>, label: 'Quản lý nhóm', module: 'team' },
        { href: '/settings', icon: <Settings size={17} strokeWidth={1.8}/>, label: 'Cài đặt', module: 'settings' },
      ],
    },
  ];

  return (
    <aside
      className="w-[252px] min-w-[252px] flex flex-col h-screen overflow-y-auto transition-colors"
      style={{
        background: 'var(--smc-surface)',
        borderRight: '1px solid var(--smc-border)',
        boxShadow: '1px 0 0 0 var(--smc-border)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5" style={{ borderBottom: '1px solid var(--smc-border-2)' }}>
        <div
          className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
          style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)', boxShadow: '0 4px 12px rgba(79,70,229,0.3)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/>
          </svg>
        </div>
        <div className="leading-tight">
          <div className="text-[13px] font-bold" style={{ color: 'var(--smc-text)' }}>Shop Management</div>
          <div className="text-[13px] font-bold text-[#4f46e5]">Core</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-3 flex-1">
        {sections.map((section, si) => {
          const visibleItems = section.items.filter(item => canAccess(role, item.module));
          if (visibleItems.length === 0) return null;
          return (
            <div key={si} className={si > 0 ? 'mt-1' : ''}>
              {section.label && (
                <div
                  className="px-3 pt-3 pb-1 text-[10px] font-bold tracking-widest"
                  style={{ color: 'var(--smc-text-4)' }}
                >
                  {section.label}
                </div>
              )}
              {visibleItems.map((item) => {
                const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                const isTiktok = item.href === '/tiktok';
                const isShopee = item.href === '/shopee';
                const platformActive = isTiktok ? active : isShopee ? active : null;

                const activeColor = isTiktok ? '#e11d48' : isShopee ? '#ea580c' : '#2563eb';
                const activeBg = isTiktok ? 'rgba(225,29,72,0.08)' : isShopee ? 'rgba(234,88,12,0.08)' : 'var(--smc-nav-active)';

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] mb-0.5 text-[13.5px] font-medium relative transition-all duration-150"
                    style={active ? {
                      background: activeBg,
                      color: activeColor,
                      fontWeight: 600,
                    } : {
                      color: 'var(--smc-text-3)',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'var(--smc-nav-hover)'; e.currentTarget.style.color = 'var(--smc-text)'; } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--smc-text-3)'; } }}
                  >
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full"
                        style={{ background: activeColor }}
                      />
                    )}
                    <span style={{ color: active ? activeColor : 'var(--smc-text-4)' }}>
                      {item.icon}
                    </span>
                    {item.label}
                  </Link>
                );
              })}

              {/* "Thêm sàn" button after platform section */}
              {section.label === 'CÁC SÀN' && canAccess(role, 'shops') && (
                <Link
                  href="/shops"
                  className="flex items-center gap-2 px-3 py-2 rounded-[10px] mb-0.5 text-[12px] transition-all duration-150"
                  style={{ color: 'var(--smc-text-4)' }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--smc-nav-hover)'; e.currentTarget.style.color = 'var(--smc-text-3)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--smc-text-4)'; }}
                >
                  <Plus size={13} strokeWidth={2}/>
                  Kết nối sàn mới
                </Link>
              )}
            </div>
          );
        })}
      </nav>

      {/* Plan card */}
      <div className="p-3.5" style={{ borderTop: '1px solid var(--smc-border-2)' }}>
        <div
          className="rounded-[14px] p-3.5"
          style={{ background: 'var(--smc-nav-active)', border: '1px solid #dbeafe33' }}
        >
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#1e40af]">
            <Star size={13} fill="#2563eb" strokeWidth={0}/> Gói Doanh nghiệp
          </div>
          <div className="text-[11px] mt-0.5" style={{ color: 'var(--smc-text-3)' }}>Hiệu lực đến 30/06/2025</div>
          <div className="text-[11.5px] font-medium mt-2.5" style={{ color: 'var(--smc-text-2)' }}>7,450 / 10,000 sản phẩm</div>
          <div className="mt-1.5 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--smc-border)' }}>
            <div className="h-full rounded-full" style={{ width: '74.5%', background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }}/>
          </div>
          <button
            className="mt-2.5 w-full py-2 rounded-[9px] text-white text-[12.5px] font-semibold transition-opacity hover:opacity-85 cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}
          >
            Nâng cấp gói
          </button>
        </div>
      </div>
    </aside>
  );
}
