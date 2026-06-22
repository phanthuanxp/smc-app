import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { seedIfEmpty } from '@/lib/seed';

export async function GET() {
  const db = getDb();
  seedIfEmpty();
  const trends = db.prepare(`SELECT * FROM market_trends ORDER BY score DESC`).all();
  const topKeywords = db.prepare(`SELECT keyword, trend, score FROM market_trends ORDER BY score DESC LIMIT 10`).all();
  return NextResponse.json({ trends, topKeywords });
}
