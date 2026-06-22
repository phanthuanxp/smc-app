const CONFIGS: Record<string, { bg: string; text: string; label: string }> = {
  // order statuses
  new:        { bg: '#eff6ff', text: '#2563eb', label: 'Mới' },
  processing: { bg: '#fff7ed', text: '#ea580c', label: 'Đang xử lý' },
  completed:  { bg: '#dcfce7', text: '#16a34a', label: 'Hoàn tất' },
  cancelled:  { bg: '#f1f5f9', text: '#64748b', label: 'Đã huỷ' },
  error:      { bg: '#fef2f2', text: '#dc2626', label: 'Lỗi đồng bộ' },
  // product statuses
  active:     { bg: '#dcfce7', text: '#16a34a', label: 'Đang bán' },
  inactive:   { bg: '#f1f5f9', text: '#64748b', label: 'Ngừng bán' },
  draft:      { bg: '#fafafa', text: '#94a3b8', label: 'Nháp' },
  // listing statuses
  pending:    { bg: '#fff7ed', text: '#ea580c', label: 'Chờ duyệt' },
  rejected:   { bg: '#fef2f2', text: '#dc2626', label: 'Từ chối' },
  // shop statuses
  low_stock:  { bg: '#fff7ed', text: '#ea580c', label: 'Sắp hết hàng' },
  out_of_stock: { bg: '#fef2f2', text: '#dc2626', label: 'Hết hàng' },
};

export default function StatusPill({ status, label: customLabel }: { status: string; label?: string }) {
  const cfg = CONFIGS[status] ?? { bg: '#f1f5f9', text: '#64748b', label: status };
  return (
    <span
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11.5px] font-semibold"
      style={{ background: cfg.bg, color: cfg.text }}
    >
      {customLabel ?? cfg.label}
    </span>
  );
}
