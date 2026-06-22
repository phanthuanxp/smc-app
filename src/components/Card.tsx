import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
}
export default function Card({ children, className = '', padding = 'p-5' }: CardProps) {
  return (
    <div
      className={`bg-white border border-[#e8edf5] rounded-[18px] ${padding} ${className}`}
      style={{ boxShadow: '0 2px 12px rgba(15,23,42,0.05)' }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold text-[#0f172a]">{title}</h2>
      {action}
    </div>
  );
}

export function ViewAll({ href = '#', label = 'Xem tất cả →' }: { href?: string; label?: string }) {
  return (
    <a href={href} className="text-[12.5px] font-semibold text-[#2563eb] hover:opacity-70 transition-opacity cursor-pointer">
      {label}
    </a>
  );
}
