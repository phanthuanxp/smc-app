import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const rows = getDb()
    .prepare('SELECT * FROM ai_configs ORDER BY priority ASC')
    .all() as { id: number; provider: string; model: string; endpoint: string; enabled: number; priority: number; api_key: string }[];

  const configs = rows.map(r => ({
    id: r.id,
    provider: r.provider,
    model: r.model,
    endpoint: r.endpoint,
    enabled: r.enabled,
    priority: r.priority,
    has_key: !!r.api_key,
    api_key_tail: r.api_key ? r.api_key.slice(-4) : '',
  }));

  return NextResponse.json({ configs });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    provider: string;
    model?: string;
    endpoint?: string;
    enabled?: number;
    priority?: number;
    api_key?: string;
  };
  const { provider, model, endpoint, enabled, priority, api_key } = body;

  const db = getDb();

  if (api_key !== undefined) {
    db.prepare(
      "UPDATE ai_configs SET model=?,endpoint=?,enabled=?,priority=?,api_key=?,updated_at=datetime('now') WHERE provider=?"
    ).run(model ?? '', endpoint ?? '', enabled ?? 0, priority ?? 99, api_key, provider);
  } else {
    db.prepare(
      "UPDATE ai_configs SET model=?,endpoint=?,enabled=?,priority=?,updated_at=datetime('now') WHERE provider=?"
    ).run(model ?? '', endpoint ?? '', enabled ?? 0, priority ?? 99, provider);
  }

  return NextResponse.json({ ok: true });
}

// Test connectivity for a single provider
export async function PUT(req: NextRequest) {
  const { provider } = await req.json() as { provider: string };
  try {
    const { testProvider } = await import('@/lib/ai-router');
    const result = await testProvider(provider);
    return NextResponse.json({ ok: true, result });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: (e as Error).message });
  }
}
