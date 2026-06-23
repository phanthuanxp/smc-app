import type { ReactNode } from 'react';

// ── Brand colors + fallback short ───────────────────────────────────────────
const CHANNELS: Record<string, { bg: string; color: string; label: string; short: string }> = {
  tiktok:   { bg: '#010101', color: '#fff',     label: 'TikTok Shop',    short: 'Tk' },
  shopee:   { bg: '#ee4d2d', color: '#fff',     label: 'Shopee',         short: 'Sp' },
  lazada:   { bg: '#0f146b', color: '#fff',     label: 'Lazada',         short: 'Lz' },
  tiki:     { bg: '#1a94ff', color: '#fff',     label: 'Tiki',           short: 'Ti' },
  facebook: { bg: '#1877f2', color: '#fff',     label: 'Facebook Shop',  short: 'fb' },
  website:  { bg: '#f1f5f9', color: '#64748b',  label: 'Website',        short: 'W'  },
};

// ── SVG Logos ────────────────────────────────────────────────────────────────

/** TikTok — the iconic musical-note "d" shape */
const TikTokLogo = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5
      2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01
      a6.34 6.34 0 100 12.63 6.34 6.34 0 006.33-6.34V8.94a8.22 8.22 0 004.82 1.55V7.05
      a4.85 4.85 0 01-1.84-.36z"/>
  </svg>
);

/** Shopee — shopping bag with smile, brand orange bg */
const ShopeeLogo = () => (
  <svg viewBox="0 0 100 100" width="14" height="14">
    {/* handle arch */}
    <path d="M30 40 Q30 18 50 18 Q70 18 70 40" fill="none" stroke="white" strokeWidth="8" strokeLinecap="round"/>
    {/* bag body */}
    <rect x="14" y="38" width="72" height="52" rx="8" fill="white"/>
    {/* face */}
    <circle cx="37" cy="62" r="5" fill="#ee4d2d"/>
    <circle cx="63" cy="62" r="5" fill="#ee4d2d"/>
    <path d="M35 74 Q50 84 65 74" fill="none" stroke="#ee4d2d" strokeWidth="4" strokeLinecap="round"/>
  </svg>
);

/** Lazada — purple background with the stylised "L" wordmark */
const LazadaLogo = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="white">
    <rect x="5"  y="3"  width="4"  height="16" rx="1.5"/>
    <rect x="5"  y="16" width="14" height="4"  rx="1.5"/>
  </svg>
);

/** Tiki — simplified cute bear face (Tiki's mascot) */
const TikiLogo = () => (
  <svg viewBox="0 0 100 100" width="14" height="14">
    {/* ears */}
    <circle cx="25" cy="28" r="16" fill="white"/>
    <circle cx="75" cy="28" r="16" fill="white"/>
    {/* head */}
    <circle cx="50" cy="58" r="34" fill="white"/>
    {/* eyes */}
    <circle cx="37" cy="52" r="6" fill="#1a94ff"/>
    <circle cx="63" cy="52" r="6" fill="#1a94ff"/>
    <circle cx="37" cy="52" r="3" fill="white"/>
    <circle cx="63" cy="52" r="3" fill="white"/>
    {/* nose */}
    <ellipse cx="50" cy="66" rx="7" ry="5" fill="#1a94ff"/>
    {/* smile */}
    <path d="M38 76 Q50 86 62 76" fill="none" stroke="#1a94ff" strokeWidth="3.5" strokeLinecap="round"/>
  </svg>
);

/** Facebook — the classic "f" */
const FacebookLogo = () => (
  <svg viewBox="0 0 24 24" width="12" height="12" fill="white">
    <path d="M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z"/>
  </svg>
);

/** Website — globe with meridians */
const WebsiteLogo = () => (
  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#64748b" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="12" cy="12" r="9"/>
    <line x1="3" y1="12" x2="21" y2="12"/>
    <path d="M12 3a14 14 0 010 18M12 3a14 14 0 000 18"/>
  </svg>
);

// ── Logo map ─────────────────────────────────────────────────────────────────
const LOGOS: Record<string, ReactNode> = {
  tiktok:   <TikTokLogo/>,
  shopee:   <ShopeeLogo/>,
  lazada:   <LazadaLogo/>,
  tiki:     <TikiLogo/>,
  facebook: <FacebookLogo/>,
  website:  <WebsiteLogo/>,
};

// ── Helper — reusable logo square ────────────────────────────────────────────
function LogoSquare({ channel, size = 'sm' }: { channel: string; size?: 'sm' | 'md' | 'lg' }) {
  const c = CHANNELS[channel] ?? { bg: '#e2e8f0', color: '#64748b', label: channel, short: channel[0].toUpperCase() };
  const logo = LOGOS[channel];
  const dim = size === 'lg' ? 'w-9 h-9 rounded-[9px]' : size === 'md' ? 'w-6 h-6 rounded-[7px]' : 'w-5 h-5 rounded-[5px]';
  return (
    <span
      title={c.label}
      className={`inline-flex items-center justify-center flex-shrink-0 ${dim}`}
      style={{ background: c.bg }}
    >
      {logo ?? (
        <span className="text-[9px] font-extrabold" style={{ color: c.color }}>
          {c.short}
        </span>
      )}
    </span>
  );
}

// ── Public components ─────────────────────────────────────────────────────────

export function ChannelBadge({ channel }: { channel: string }) {
  return <LogoSquare channel={channel} size="sm"/>;
}

export function ChannelBadgeMd({ channel }: { channel: string }) {
  return <LogoSquare channel={channel} size="md"/>;
}

export function ChannelBadgeLg({ channel }: { channel: string }) {
  return <LogoSquare channel={channel} size="lg"/>;
}

export function ChannelChip({ channel, count }: { channel: string; count: number }) {
  const c = CHANNELS[channel] ?? { bg: '#e2e8f0', color: '#64748b', label: channel, short: channel[0].toUpperCase() };
  return (
    <div className="flex items-center gap-2 px-3.5 py-2 border border-[#e8edf5] rounded-[12px] bg-white hover:border-[#2563eb] hover:bg-[#eff6ff] transition-all cursor-pointer group">
      <LogoSquare channel={channel} size="sm"/>
      <span className="text-[13px] font-medium text-[#374151] group-hover:text-[#2563eb] transition-colors">{c.label}</span>
      <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] flex-shrink-0"/>
      <span className="bg-[#f1f5f9] text-[#475569] text-[11.5px] font-semibold rounded-[6px] px-1.5 py-0.5">{count}</span>
    </div>
  );
}

export const CHANNEL_LABELS = CHANNELS;
