'use client';
import { useState, useEffect, useCallback } from 'react';
import { User, Bell, Shield, Palette, Globe, Database, ChevronRight, Check, Bot, Eye, EyeOff, ChevronUp, ChevronDown, Loader2, Wifi, WifiOff } from 'lucide-react';
import Card from '@/components/Card';
import PageShell from '@/components/PageShell';

const PROVIDER_LABELS: Record<string, string> = {
  claude:   'Claude (Anthropic)',
  openai:   'OpenAI (GPT)',
  gemini:   'Gemini (Google)',
  grok:     'Grok (xAI)',
  '9router':'9Router',
};

const PROVIDER_MODELS: Record<string, string[]> = {
  claude:   ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai:   ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini:   ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  grok:     ['grok-2-latest', 'grok-beta'],
  '9router':['auto'],
};

const PROVIDER_COLORS: Record<string, string> = {
  claude:   '#d97706',
  openai:   '#16a34a',
  gemini:   '#2563eb',
  grok:     '#7c3aed',
  '9router':'#0891b2',
};

const PROVIDER_ICONS: Record<string, string> = {
  claude: 'C', openai: 'O', gemini: 'G', grok: 'X', '9router': '9',
};

const SECTIONS = [
  { icon: User,     label: 'Tài khoản',        id: 'account' },
  { icon: Bot,      label: 'AI Models',         id: 'ai' },
  { icon: Bell,     label: 'Thông báo',         id: 'notifications' },
  { icon: Shield,   label: 'Bảo mật',           id: 'security' },
  { icon: Palette,  label: 'Giao diện',         id: 'appearance' },
  { icon: Globe,    label: 'Kết nối kênh',      id: 'channels' },
  { icon: Database, label: 'Dữ liệu & Sao lưu', id: 'data' },
];

interface AiConfigRow {
  id: number;
  provider: string;
  model: string;
  endpoint: string;
  enabled: number;
  priority: number;
  has_key: boolean;
  api_key_tail: string;
}

function AiModelSection() {
  const [configs, setConfigs]   = useState<AiConfigRow[]>([]);
  const [editing, setEditing]   = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [showKey, setShowKey]   = useState(false);
  const [saving, setSaving]     = useState<string | null>(null);
  const [testing, setTesting]   = useState<string | null>(null);
  const [testResult, setTestResult] = useState<Record<string, { ok: boolean; msg: string }>>({});
  const [saved, setSaved]       = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/ai-config');
    const data = await res.json();
    setConfigs(data.configs);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleEnabled = async (provider: string, current: number) => {
    const cfg = configs.find(c => c.provider === provider)!;
    await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, enabled: current ? 0 : 1 }),
    });
    load();
  };

  const saveModel = async (provider: string, model: string) => {
    const cfg = configs.find(c => c.provider === provider)!;
    await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, model }),
    });
    load();
  };

  const saveEndpoint = async (provider: string, endpoint: string) => {
    const cfg = configs.find(c => c.provider === provider)!;
    await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, endpoint }),
    });
    load();
  };

  const saveKey = async (provider: string) => {
    if (!keyInput.trim()) return;
    setSaving(provider);
    const cfg = configs.find(c => c.provider === provider)!;
    await fetch('/api/ai-config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cfg, api_key: keyInput.trim() }),
    });
    setSaving(null);
    setEditing(null);
    setKeyInput('');
    setSaved(provider);
    setTimeout(() => setSaved(null), 2000);
    load();
  };

  const movePriority = async (provider: string, direction: 'up' | 'down') => {
    const sorted = [...configs].sort((a, b) => a.priority - b.priority);
    const idx = sorted.findIndex(c => c.provider === provider);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= sorted.length) return;
    const a = sorted[idx], b = sorted[swapIdx];
    await Promise.all([
      fetch('/api/ai-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...a, priority: b.priority }) }),
      fetch('/api/ai-config', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...b, priority: a.priority }) }),
    ]);
    load();
  };

  const testConn = async (provider: string) => {
    setTesting(provider);
    const res = await fetch('/api/ai-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider }),
    });
    const data = await res.json();
    setTestResult(r => ({ ...r, [provider]: { ok: data.ok, msg: data.ok ? 'Kết nối thành công!' : data.error } }));
    setTesting(null);
  };

  const sorted = [...configs].sort((a, b) => a.priority - b.priority);
  const enabledCount = configs.filter(c => c.enabled).length;

  return (
    <div className="space-y-4">
      {/* Header info */}
      <Card padding="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 rounded-[10px] bg-[#eff6ff] flex items-center justify-center">
            <Bot size={18} className="text-[#2563eb]"/>
          </div>
          <div>
            <p className="text-[14px] font-bold text-[#0f172a]">Quản lý AI Models</p>
            <p className="text-[12px] text-[#64748b]">{enabledCount} provider đang bật · Thứ tự ưu tiên từ trên xuống dưới</p>
          </div>
        </div>
        <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-[10px] text-[12px] text-[#166534]">
          <strong>Cách hoạt động:</strong> Hệ thống thử provider theo thứ tự ưu tiên. Nếu provider đầu hết quota hoặc rate-limit, tự động chuyển sang provider tiếp theo.
        </div>
      </Card>

      {/* Provider list */}
      {sorted.map((cfg, idx) => {
        const color = PROVIDER_COLORS[cfg.provider] ?? '#64748b';
        const icon  = PROVIDER_ICONS[cfg.provider] ?? '?';
        const models = PROVIDER_MODELS[cfg.provider] ?? [];
        const tr = testResult[cfg.provider];
        const isEditingThis = editing === cfg.provider;

        return (
          <Card key={cfg.provider} padding="p-5">
            <div className="flex items-start gap-4">
              {/* Priority controls */}
              <div className="flex flex-col items-center gap-0.5 pt-0.5">
                <button onClick={() => movePriority(cfg.provider, 'up')} disabled={idx === 0}
                  className="p-0.5 rounded hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">
                  <ChevronUp size={14} className="text-[#94a3b8]"/>
                </button>
                <span className="text-[11px] font-bold text-[#94a3b8]">{idx + 1}</span>
                <button onClick={() => movePriority(cfg.provider, 'down')} disabled={idx === sorted.length - 1}
                  className="p-0.5 rounded hover:bg-[#f1f5f9] disabled:opacity-30 transition-colors">
                  <ChevronDown size={14} className="text-[#94a3b8]"/>
                </button>
              </div>

              {/* Provider icon */}
              <div className="w-10 h-10 rounded-[11px] flex items-center justify-center text-white text-[15px] font-extrabold flex-shrink-0"
                style={{ background: color }}>
                {icon}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[14px] font-bold text-[#0f172a]">{PROVIDER_LABELS[cfg.provider] ?? cfg.provider}</span>
                  {cfg.has_key && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#f0fdf4] text-[#16a34a] border border-[#bbf7d0]">
                      Key: ••••{cfg.api_key_tail}
                    </span>
                  )}
                  {!cfg.has_key && (
                    <span className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full bg-[#fef9c3] text-[#854d0e] border border-[#fef08a]">
                      Chưa có key
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 mb-3">
                  {/* Model select */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#64748b] mb-1">Model</label>
                    <select
                      value={cfg.model}
                      onChange={e => saveModel(cfg.provider, e.target.value)}
                      className="w-full h-9 px-2.5 bg-[#f6f8fc] border border-[#e8edf5] rounded-[8px] text-[12.5px] outline-none focus:border-[#2563eb] cursor-pointer">
                      {models.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>

                  {/* Endpoint (9router only) */}
                  {cfg.provider === '9router' && (
                    <div>
                      <label className="block text-[11px] font-semibold text-[#64748b] mb-1">Base URL</label>
                      <input
                        defaultValue={cfg.endpoint}
                        onBlur={e => saveEndpoint(cfg.provider, e.target.value)}
                        placeholder="https://9router.com/v1"
                        className="w-full h-9 px-2.5 bg-[#f6f8fc] border border-[#e8edf5] rounded-[8px] text-[12.5px] outline-none focus:border-[#2563eb]"/>
                    </div>
                  )}
                </div>

                {/* API Key input */}
                {isEditingThis ? (
                  <div className="mb-3">
                    <label className="block text-[11px] font-semibold text-[#64748b] mb-1">API Key mới</label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={keyInput}
                          onChange={e => setKeyInput(e.target.value)}
                          placeholder={`Nhập ${PROVIDER_LABELS[cfg.provider]} API key...`}
                          className="w-full h-9 pl-3 pr-9 bg-white border border-[#2563eb] rounded-[8px] text-[12.5px] outline-none"/>
                        <button onClick={() => setShowKey(s => !s)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#475569]">
                          {showKey ? <EyeOff size={13}/> : <Eye size={13}/>}
                        </button>
                      </div>
                      <button onClick={() => saveKey(cfg.provider)} disabled={saving === cfg.provider}
                        className="px-3 h-9 rounded-[8px] bg-[#2563eb] text-white text-[12.5px] font-semibold hover:opacity-85 disabled:opacity-60 transition-opacity flex items-center gap-1.5">
                        {saving === cfg.provider ? <Loader2 size={12} className="animate-spin"/> : <Check size={12}/>}
                        Lưu
                      </button>
                      <button onClick={() => { setEditing(null); setKeyInput(''); }}
                        className="px-3 h-9 rounded-[8px] border border-[#e8edf5] text-[12.5px] text-[#64748b] hover:bg-[#f6f8fc] transition-colors">
                        Huỷ
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => { setEditing(cfg.provider); setKeyInput(''); setShowKey(false); }}
                      className="text-[12px] font-semibold text-[#2563eb] hover:opacity-70 transition-opacity">
                      {cfg.has_key ? 'Đổi API key' : '+ Thêm API key'}
                    </button>
                    {saved === cfg.provider && (
                      <span className="text-[11.5px] text-[#16a34a] font-semibold flex items-center gap-1"><Check size={11}/>Đã lưu</span>
                    )}
                  </div>
                )}

                {/* Test result */}
                {tr && (
                  <div className={`mb-3 flex items-center gap-1.5 text-[12px] font-medium ${tr.ok ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}>
                    {tr.ok ? <Wifi size={12}/> : <WifiOff size={12}/>}
                    {tr.msg}
                  </div>
                )}

                {/* Actions row */}
                <div className="flex items-center justify-between">
                  <button onClick={() => testConn(cfg.provider)} disabled={!cfg.has_key || testing === cfg.provider}
                    className="flex items-center gap-1.5 text-[12px] font-semibold text-[#475569] hover:text-[#0f172a] disabled:opacity-40 transition-colors">
                    {testing === cfg.provider ? <Loader2 size={12} className="animate-spin"/> : <Wifi size={12}/>}
                    Test kết nối
                  </button>

                  {/* Enable toggle */}
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-[#64748b]">{cfg.enabled ? 'Đang bật' : 'Tắt'}</span>
                    <button onClick={() => toggleEnabled(cfg.provider, cfg.enabled)}
                      className={`relative w-10 h-6 rounded-full transition-colors ${cfg.enabled ? 'bg-[#2563eb]' : 'bg-[#e2e8f0]'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${cfg.enabled ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

export default function SettingsPage() {
  const [section, setSection] = useState('account');
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({ name: 'Admin', email: 'admintrip', phone: '', language: 'vi', timezone: 'Asia/Ho_Chi_Minh' });

  const handleSave = async () => {
    await new Promise(r => setTimeout(r, 600));
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <PageShell title="Cài đặt hệ thống" subtitle="Quản lý tài khoản, AI models và cấu hình kênh bán hàng">
      <div className="grid gap-5" style={{ gridTemplateColumns: '220px 1fr' }}>
        {/* Sidebar nav */}
        <div className="space-y-1">
          {SECTIONS.map(s => {
            const Icon = s.icon;
            return (
              <button key={s.id} onClick={() => setSection(s.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] text-left transition-all ${section === s.id ? 'bg-[#eff6ff] text-[#2563eb] font-semibold' : 'text-[#475569] hover:bg-[#f6f8fc]'}`}>
                <Icon size={16} className={section === s.id ? 'text-[#2563eb]' : 'text-[#94a3b8]'}/>
                <span className="text-[13.5px]">{s.label}</span>
                <ChevronRight size={13} className={`ml-auto ${section === s.id ? 'text-[#2563eb]' : 'text-[#cbd5e1]'}`}/>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div>
          {section === 'account' && (
            <Card padding="p-6">
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-5">Thông tin tài khoản</h3>
              <div className="flex items-center gap-5 mb-6 pb-6 border-b border-[#f0f3f8]">
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-[24px] font-bold" style={{ background: 'linear-gradient(135deg,#2563eb,#7c3aed)' }}>A</div>
                <div>
                  <p className="text-[15px] font-bold text-[#0f172a]">{form.name}</p>
                  <p className="text-[13px] text-[#64748b]">Quản trị viên</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[['Họ và tên', 'name', 'text'], ['Tên đăng nhập', 'email', 'text'], ['Số điện thoại', 'phone', 'tel'], ['Ngôn ngữ', 'language', 'select'], ['Múi giờ', 'timezone', 'select']].map(([label, field, type]) => (
                  <div key={field} className={field === 'timezone' ? 'col-span-2' : ''}>
                    <label className="block text-[12px] font-semibold text-[#64748b] mb-1.5">{label}</label>
                    {type === 'select' ? (
                      <select value={form[field as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[10px] text-[13.5px] outline-none focus:border-[#2563eb] cursor-pointer">
                        {field === 'language' ? <><option value="vi">Tiếng Việt</option><option value="en">English</option></> : <><option value="Asia/Ho_Chi_Minh">Việt Nam (GMT+7)</option><option value="Asia/Bangkok">Bangkok (GMT+7)</option></>}
                      </select>
                    ) : (
                      <input type={type} value={form[field as keyof typeof form]} onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                        className="w-full h-10 px-3 bg-[#f6f8fc] border border-[#e8edf5] rounded-[10px] text-[13.5px] outline-none focus:border-[#2563eb] focus:bg-white transition-colors"/>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 flex items-center gap-3">
                <button onClick={handleSave}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-[10px] text-white text-[13.5px] font-semibold hover:opacity-85 transition-opacity"
                  style={{ background: 'linear-gradient(135deg,#2563eb,#4f46e5)' }}>
                  {saved ? <><Check size={15}/>Đã lưu!</> : 'Lưu thay đổi'}
                </button>
                <button className="px-5 py-2.5 border border-[#e8edf5] rounded-[10px] text-[13.5px] font-semibold text-[#64748b] hover:bg-[#f6f8fc] transition-colors">Huỷ</button>
              </div>
            </Card>
          )}

          {section === 'ai' && <AiModelSection />}

          {section === 'notifications' && (
            <Card padding="p-6">
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-5">Cài đặt thông báo</h3>
              <div className="space-y-4">
                {[
                  ['Đơn hàng mới', 'Nhận thông báo khi có đơn hàng mới', true],
                  ['Sản phẩm sắp hết hàng', 'Cảnh báo khi tồn kho xuống dưới ngưỡng', true],
                  ['Lỗi đồng bộ', 'Thông báo khi listing bị lỗi hoặc bị từ chối', true],
                  ['Báo cáo hàng ngày', 'Gửi báo cáo tổng hợp mỗi ngày lúc 8h sáng', false],
                  ['Xu hướng thị trường', 'Cập nhật xu hướng từ khóa hàng tuần', false],
                ].map(([label, desc, def], i) => {
                  // eslint-disable-next-line react-hooks/rules-of-hooks
                  const [on, setOn] = useState(!!def);
                  return (
                    <div key={i} className="flex items-center justify-between p-4 bg-[#f8fafc] rounded-[12px]">
                      <div>
                        <p className="text-[13.5px] font-semibold text-[#0f172a]">{label as string}</p>
                        <p className="text-[12px] text-[#64748b] mt-0.5">{desc as string}</p>
                      </div>
                      <button onClick={() => setOn(!on)} className={`relative w-10 h-6 rounded-full transition-colors ${on ? 'bg-[#2563eb]' : 'bg-[#e2e8f0]'}`}>
                        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`}/>
                      </button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {(section === 'security' || section === 'appearance' || section === 'channels' || section === 'data') && (
            <Card padding="p-10" className="flex flex-col items-center justify-center text-center min-h-[300px]">
              <div className="w-14 h-14 rounded-[16px] bg-[#f1f5f9] flex items-center justify-center mb-4">
                {(() => { const S = SECTIONS.find(s => s.id === section); const Icon = S?.icon ?? User; return <Icon size={24} className="text-[#94a3b8]"/>; })()}
              </div>
              <h3 className="text-[16px] font-bold text-[#0f172a] mb-2">{SECTIONS.find(s => s.id === section)?.label}</h3>
              <p className="text-[13.5px] text-[#64748b]">Tính năng đang được phát triển trong phiên bản tiếp theo</p>
            </Card>
          )}
        </div>
      </div>
    </PageShell>
  );
}
