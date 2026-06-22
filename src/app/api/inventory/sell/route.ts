import { NextRequest, NextResponse } from 'next/server';
import { recordSale } from '@/lib/channels/sync-engine';

// Simulate / record a sale on a channel to demonstrate anti-oversell:
// decrements master stock and pushes the new level to all channels.
// Body: { productId: number, qty: number }
export async function POST(req: NextRequest) {
  const { productId, qty } = await req.json();
  if (!productId || !qty || qty <= 0) {
    return NextResponse.json({ error: 'Thiếu productId hoặc qty không hợp lệ' }, { status: 400 });
  }
  const result = await recordSale(productId, qty);
  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 404 });
  return NextResponse.json(result);
}
