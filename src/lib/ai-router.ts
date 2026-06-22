import Anthropic from '@anthropic-ai/sdk';
import { getDb } from './db';

export interface AiConfig {
  id: number;
  provider: string;
  api_key: string;
  model: string;
  endpoint: string;
  enabled: number;
  priority: number;
}

export function getAiConfigs(): AiConfig[] {
  return getDb()
    .prepare('SELECT * FROM ai_configs ORDER BY priority ASC')
    .all() as AiConfig[];
}

function isQuotaError(status: number, body: string): boolean {
  if (status === 429 || status === 402) return true;
  const b = body.toLowerCase();
  return (
    b.includes('rate_limit') ||
    b.includes('quota') ||
    b.includes('insufficient') ||
    b.includes('token') && b.includes('limit') ||
    b.includes('overloaded')
  );
}

async function callClaude(cfg: AiConfig, system: string, user: string): Promise<string> {
  const key = cfg.api_key || process.env.ANTHROPIC_API_KEY || '';
  if (!key) throw new Error('Claude: chưa có API key');
  const client = new Anthropic({ apiKey: key });
  const resp = await client.messages.create({
    model: cfg.model || 'claude-sonnet-4-6',
    max_tokens: 2048,
    system,
    messages: [{ role: 'user', content: user }],
  });
  return resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map(b => b.text)
    .join('\n')
    .trim();
}

async function callOpenAICompat(
  cfg: AiConfig,
  system: string,
  user: string,
  baseUrl: string
): Promise<string> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.api_key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: cfg.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_tokens: 2048,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    const err = Object.assign(new Error(msg), { httpStatus: res.status, body: JSON.stringify(data) });
    throw err;
  }
  return (data.choices[0].message.content as string).trim();
}

async function callGemini(cfg: AiConfig, system: string, user: string): Promise<string> {
  const model = cfg.model || 'gemini-2.0-flash';
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${cfg.api_key}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: 2048 },
      }),
    }
  );
  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || JSON.stringify(data);
    throw Object.assign(new Error(msg), { httpStatus: res.status, body: JSON.stringify(data) });
  }
  return (data.candidates[0].content.parts[0].text as string).trim();
}

async function callProvider(cfg: AiConfig, system: string, user: string): Promise<string> {
  switch (cfg.provider) {
    case 'claude':
      return callClaude(cfg, system, user);
    case 'openai':
      return callOpenAICompat(cfg, system, user, 'https://api.openai.com/v1');
    case 'grok':
      return callOpenAICompat(cfg, system, user, 'https://api.x.ai/v1');
    case '9router': {
      const base = cfg.endpoint?.trim() || 'https://9router.com/v1';
      return callOpenAICompat(cfg, system, user, base);
    }
    case 'gemini':
      return callGemini(cfg, system, user);
    default:
      throw new Error(`Provider không hỗ trợ: ${cfg.provider}`);
  }
}

export const PROVIDER_LABELS: Record<string, string> = {
  claude: 'Claude (Anthropic)',
  openai: 'OpenAI (GPT)',
  gemini: 'Gemini (Google)',
  grok: 'Grok (xAI)',
  '9router': '9Router',
};

export const PROVIDER_MODELS: Record<string, string[]> = {
  claude: ['claude-opus-4-8', 'claude-sonnet-4-6', 'claude-haiku-4-5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'],
  gemini: ['gemini-2.0-flash', 'gemini-1.5-pro', 'gemini-1.5-flash'],
  grok: ['grok-2-latest', 'grok-beta'],
  '9router': ['auto'],
};

export async function testProvider(provider: string): Promise<string> {
  const db = getDb();
  const cfg = db.prepare('SELECT * FROM ai_configs WHERE provider=?').get(provider) as AiConfig | undefined;
  if (!cfg) throw new Error('Provider không tồn tại');
  return callProvider(cfg, 'Bạn là trợ lý AI.', 'Trả lời bằng đúng 3 từ: "Kết nối thành công!"');
}

// Try providers in priority order, fallback on quota/rate-limit errors.
export async function routeAi(system: string, userMessage: string): Promise<{ result: string; provider: string; model: string }> {
  const db = getDb();
  const configs = db
    .prepare('SELECT * FROM ai_configs WHERE enabled=1 ORDER BY priority ASC')
    .all() as AiConfig[];

  // Fallback: if no DB config enabled but env key exists, use Claude with env key
  if (configs.length === 0) {
    if (process.env.ANTHROPIC_API_KEY) {
      const result = await callClaude(
        { id: 0, provider: 'claude', api_key: '', model: 'claude-sonnet-4-6', endpoint: '', enabled: 1, priority: 1 },
        system,
        userMessage
      );
      return { result, provider: 'claude', model: 'claude-sonnet-4-6' };
    }
    throw Object.assign(new Error('Chưa cấu hình model AI nào. Vào Cài đặt → AI Models để thêm API key.'), {
      configRequired: true,
    });
  }

  const errors: string[] = [];
  for (const cfg of configs) {
    try {
      const result = await callProvider(cfg, system, userMessage);
      return { result, provider: cfg.provider, model: cfg.model };
    } catch (e: unknown) {
      const err = e as Error & { httpStatus?: number; body?: string };
      const retryable = isQuotaError(err.httpStatus ?? 0, err.body ?? err.message ?? '');
      errors.push(`${PROVIDER_LABELS[cfg.provider] ?? cfg.provider}: ${err.message}`);
      if (!retryable) throw new Error(errors.join(' | '));
      // quota error → try next provider
    }
  }

  throw new Error(`Tất cả provider đã hết quota hoặc lỗi:\n${errors.join('\n')}`);
}
