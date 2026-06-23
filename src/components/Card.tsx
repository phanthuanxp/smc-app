import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: string;
}
export default function Card({ children, className = '', padding = 'p-5' }: CardProps) {
  return (
    <div
      className={`rounded-[18px] ${padding} ${className} transition-colors`}
      style={{
        background: 'var(--smc-surface)',
        border: '1px solid var(--smc-border)',
        boxShadow: '0 2px 12px var(--smc-shadow)',
      }}
    >
      {children}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-[15px] font-bold" style={{ color: 'var(--smc-text)' }}>{title}</h2>
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
