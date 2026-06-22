import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { getDb } from './db';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'smc-dev-secret-change-in-production-please-32chars'
);
const COOKIE = 'smc_session';

export interface SessionUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

export async function hashPassword(pw: string) {
  return bcrypt.hash(pw, 10);
}
export async function verifyPassword(pw: string, hash: string) {
  return bcrypt.compare(pw, hash);
}

export async function createSession(user: SessionUser) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
  const jar = await cookies();
  jar.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

export async function destroySession() {
  const jar = await cookies();
  jar.delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return { id: payload.id as number, email: payload.email as string, name: payload.name as string, role: payload.role as string };
  } catch {
    return null;
  }
}

// Ensure a default admin account exists (demo convenience)
export async function seedDefaultUser() {
  const db = getDb();
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (count > 0) return;
  const hash = await hashPassword('Thuan@1987');
  db.prepare('INSERT INTO users (email, name, password_hash, role) VALUES (?,?,?,?)')
    .run('admintrip', 'Admin', hash, 'owner');
}
