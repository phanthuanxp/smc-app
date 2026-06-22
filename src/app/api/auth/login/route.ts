import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { verifyPassword, createSession, seedDefaultUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  await seedDefaultUser();
  const { email, password } = await req.json();
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email=?').get(email) as
    | { id: number; email: string; name: string; password_hash: string; role: string; status?: string }
    | undefined;
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return NextResponse.json({ error: 'Email hoặc mật khẩu không đúng' }, { status: 401 });
  }
  if (user.status === 'inactive') {
    return NextResponse.json({ error: 'Tài khoản đã bị vô hiệu hoá. Liên hệ chủ shop.' }, { status: 403 });
  }
  await createSession({ id: user.id, email: user.email, name: user.name, role: user.role });
  return NextResponse.json({ ok: true, user: { name: user.name, email: user.email, role: user.role } });
}
