interface Props {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}
export default function PageShell({ title, subtitle, action, children }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-7 pb-10">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-[22px] font-extrabold text-[#0f172a] tracking-tight">{title}</h1>
          {subtitle && <p className="text-[13.5px] text-[#64748b] mt-1">{subtitle}</p>}
        </div>
        {action && <div>{action}</div>}
      </div>
      {children}
    </div>
  );
}
