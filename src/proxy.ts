import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { canAccess, pathToModule } from '@/lib/permissions';

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET ?? 'smc-dev-secret-change-in-production-please-32chars'
);

const PUBLIC = ['/login', '/api/auth/login'];

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC.some(p => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get('smc_session')?.value;
  let role: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET);
      role = (payload.role as string) ?? null;
    } catch {
      role = null;
    }
  }

  // Not authenticated
  if (!role) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Chưa đăng nhập' }, { status: 401 });
    }
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Authenticated — enforce module-level RBAC on page routes.
  // (API authorization is enforced inside each route handler.)
  if (!pathname.startsWith('/api/')) {
    const mod = pathToModule(pathname);
    if (mod && !canAccess(role, mod)) {
      const url = req.nextUrl.clone();
      url.pathname = '/';
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
