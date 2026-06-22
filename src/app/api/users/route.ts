import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession, hashPassword } from '@/lib/auth';
import { canManageTeam, normalizeRole, Role } from '@/lib/permissions';

const VALID_ROLES: Role[] = ['owner', 'manager', 'staff', 'accountant'];

// List team members — any logged-in user may view the team.
export async function GET() {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  const db = getDb();
  const users = db.prepare('SELECT id, email, name, role, status, created_at FROM users ORDER BY id').all();
  return NextResponse.json({ users, me: { id: me.id, role: normalizeRole(me.role) } });
}

// Invite a new member — owner only.
export async function POST(req: NextRequest) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  if (!canManageTeam(me.role)) return NextResponse.json({ error: 'Bạn không có quyền quản lý nhóm' }, { status: 403 });

  const { email, name, role, password } = await req.json();
  if (!email || !name || !VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Thông tin không hợp lệ' }, { status: 400 });
  }
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email=?').get(email);
  if (existing) return NextResponse.json({ error: 'Email đã tồn tại' }, { status: 409 });

  // For the demo we set an initial password (real app would email an invite link).
  const initialPassword = password && String(password).length >= 6 ? password : 'shopcore123';
  const hash = await hashPassword(initialPassword);
  const result = db.prepare(
    'INSERT INTO users (email, name, password_hash, role, status) VALUES (?,?,?,?,?)'
  ).run(email, name, hash, role, 'active');

  return NextResponse.json({ id: result.lastInsertRowid, initialPassword }, { status: 201 });
}
