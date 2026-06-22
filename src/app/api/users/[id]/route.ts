import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';
import { canManageTeam, Role } from '@/lib/permissions';

const VALID_ROLES: Role[] = ['owner', 'manager', 'staff', 'accountant'];

// Update a member's role/status — owner only.
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  if (!canManageTeam(me.role)) return NextResponse.json({ error: 'Bạn không có quyền quản lý nhóm' }, { status: 403 });

  const { id } = await params;
  if (Number(id) === me.id) return NextResponse.json({ error: 'Không thể tự đổi quyền của chính mình' }, { status: 400 });

  const { role, status } = await req.json();
  const db = getDb();
  if (role !== undefined) {
    if (!VALID_ROLES.includes(role)) return NextResponse.json({ error: 'Vai trò không hợp lệ' }, { status: 400 });
    db.prepare('UPDATE users SET role=? WHERE id=?').run(role, id);
  }
  if (status !== undefined) {
    db.prepare('UPDATE users SET status=? WHERE id=?').run(status, id);
  }
  return NextResponse.json({ ok: true });
}

// Remove a member — owner only, cannot remove self.
export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getSession();
  if (!me) return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
  if (!canManageTeam(me.role)) return NextResponse.json({ error: 'Bạn không có quyền quản lý nhóm' }, { status: 403 });

  const { id } = await params;
  if (Number(id) === me.id) return NextResponse.json({ error: 'Không thể xoá chính mình' }, { status: 400 });

  getDb().prepare('DELETE FROM users WHERE id=?').run(id);
  return NextResponse.json({ ok: true });
}
