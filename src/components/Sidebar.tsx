'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Link2, Tag, Download, Sparkles, Share2,
  Package, ShoppingCart, BarChart3, FileText, Settings, Star, Users
} from 'lucide-react';
import { canAccess, ModuleId } from '@/lib/permissions';

const NAV: { href: string; icon: typeof LayoutDashboard; label: string; module: ModuleId }[] = [
  { href: '/',               icon: LayoutDashboard, label: 'Tổng quan',            module: 'dashboard' },
  { href: '/shops',          icon: Link2,            label: 'Shop kết nối',         module: 'shops' },
  { href: '/products',       icon: Tag,              label: 'All Sản Phẩm',          module: 'products' },
  { href: '/import',         icon: Download,         label: 'Import sản phẩm',      module: 'import' },
  { href: '/ai-products',    icon: Sparkles,         label: 'AI tạo sản phẩm',      module: 'ai-products' },
  { href: '/multichannel',   icon: Share2,           label: 'Đăng đa kênh',         module: 'multichannel' },
  { href: '/inventory',      icon: Package,          label: 'Tồn kho',              module: 'inventory' },
  { href: '/orders',         icon: ShoppingCart,     label: 'Đơn hàng',             module: 'orders' },
  { href: '/market',         icon: BarChart3,        label: 'Phân tích thị trường', module: 'market' },
  { href: '/reports',        icon: FileText,         label: 'Báo cáo',              module: 'reports' },
  { href: '/team',           icon: Users,            label: 'Quản lý nhóm',         module: 'team' },
  { href: '/settings',       icon: Settings,         label: 'Cài đặt',              module: 'settings' },
];

export default function Sidebar({ role = 'owner' }: { role?: string }) {
  const pathname = usePathname();
  const nav = NAV.filter(item => canAccess(role, item.module));

  return (
    <aside
      className="w-[252px] min-w-[252px] bg-white border-r border-[#e8edf5] flex flex-col h-screen overflow-y-auto"
      style={{ boxShadow: '1px 0 0 0 #e8edf5' }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[#f0f3f8]">
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
          <div className="text-[13px] font-bold text-[#0f172a]">Shop Management</div>
          <div className="text-[13px] font-bold text-[#4f46e5]">Core</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="px-3 py-3 flex-1">
        {nav.map((item) => {
          const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          const Icon = item.icon;
          const showDivider = item.module === 'inventory' || item.module === 'team';
          return (
            <div key={item.href}>
              {showDivider && <div className="my-2 border-t border-[#f0f3f8]" />}
              <Link
                href={item.href}
                className={`
                  flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] mb-0.5 text-[13.5px] font-medium relative transition-all duration-150
                  ${active
                    ? 'bg-[#eff6ff] text-[#2563eb] font-semibold'
                    : 'text-[#475569] hover:bg-[#f1f5f9] hover:text-[#0f172a]'
                  }
                `}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#2563eb] rounded-r-full" />
                )}
                <Icon
                  size={17}
                  className={active ? 'text-[#2563eb]' : 'text-[#94a3b8]'}
                  strokeWidth={active ? 2.2 : 1.8}
                />
                {item.label}
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Plan card */}
      <div className="p-3.5 border-t border-[#f0f3f8]">
        <div className="rounded-[14px] p-3.5" style={{ background: 'linear-gradient(135deg,#eff6ff,#f5f3ff)', border: '1px solid #dbeafe' }}>
          <div className="flex items-center gap-1.5 text-[13px] font-bold text-[#1e40af]">
            <Star size={13} fill="#2563eb" strokeWidth={0} /> Gói Doanh nghiệp
          </div>
          <div className="text-[11px] text-[#64748b] mt-0.5">Hiệu lực đến 30/06/2025</div>
          <div className="text-[11.5px] text-[#374151] font-medium mt-2.5">7,450 / 10,000 sản phẩm</div>
          <div className="mt-1.5 h-1.5 bg-[#dbeafe] rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: '74.5%', background: 'linear-gradient(90deg,#2563eb,#4f46e5)' }} />
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
