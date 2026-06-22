const CHANNELS: Record<string, { bg: string; color: string; short: string; label: string }> = {
  tiktok:   { bg: '#000',     color: '#fff', short: 'T',   label: 'TikTok Shop' },
  shopee:   { bg: '#ee4d2d',  color: '#fff', short: 'S',   label: 'Shopee' },
  lazada:   { bg: '#0f146b',  color: '#fff', short: 'Laz', label: 'Lazada' },
  tiki:     { bg: '#1a94ff',  color: '#fff', short: 'Ti',  label: 'Tiki' },
  facebook: { bg: '#1877f2',  color: '#fff', short: 'fb',  label: 'Facebook Shop' },
  website:  { bg: '#f1f5f9',  color: '#64748b', short: 'W', label: 'Website' },
};

export function ChannelBadge({ channel }: { channel: string }) {
  const c = CHANNELS[channel] ?? { bg: '#e2e8f0', color: '#64748b', short: channel[0].toUpperCase(), label: channel };
  return (
    <span
      title={c.label}
      className="inline-flex items-center justify-center w-5 h-5 rounded-[5px] text-[10px] font-bold flex-shrink-0"
      style={{ background: c.bg, color: c.color }}
    >
      {c.short}
    </span>
  );
}

export function ChannelChip({ channel, count }: { channel: string; count: number }) {
  const c = CHANNELS[channel] ?? { bg: '#e2e8f0', color: '#64748b', short: '?', label: channel };
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 border border-[#e8edf5] rounded-[12px] bg-white hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb] transition-all cursor-pointer group">
      <span
        className="w-5 h-5 rounded-[5px] inline-flex items-center justify-center text-[10px] font-bold flex-shrink-0"
        style={{ background: c.bg, color: c.color }}
      >
        {c.short}
      </span>
      <span className="text-[13px] font-medium text-[#374151] group-hover:text-[#2563eb] transition-colors">{c.label}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] flex-shrink-0" />
      <span className="bg-[#f1f5f9] text-[#475569] text-[11.5px] font-semibold rounded-[6px] px-1.5 py-0.5">{count}</span>
    </div>
  );
}

export const CHANNEL_LABELS = CHANNELS;
