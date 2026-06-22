// ─────────────────────────────────────────────────────────────
// Role-Based Access Control (RBAC)
// Shared between server (proxy gate, API guards) and client (sidebar).
// No 'use client' / server-only imports here so both can use it.
// ─────────────────────────────────────────────────────────────

export type Role = 'owner' | 'manager' | 'staff' | 'accountant';

export type ModuleId =
  | 'dashboard' | 'shops' | 'products' | 'import' | 'ai-products'
  | 'multichannel' | 'inventory' | 'orders' | 'market' | 'reports'
  | 'settings' | 'team';

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Chủ shop',
  manager: 'Quản lý',
  staff: 'Nhân viên',
  accountant: 'Kế toán',
};

// Which modules each role may access.
const ROLE_MODULES: Record<Role, ModuleId[]> = {
  owner: ['dashboard','shops','products','import','ai-products','multichannel','inventory','orders','market','reports','settings','team'],
  manager: ['dashboard','shops','products','import','ai-products','multichannel','inventory','orders','market','reports','settings'],
  staff: ['dashboard','shops','products','import','ai-products','multichannel','inventory','orders'],
  accountant: ['dashboard','orders','market','reports'],
};

// Map a URL path to the module that governs it.
export function pathToModule(pathname: string): ModuleId | null {
  if (pathname === '/' ) return 'dashboard';
  const seg = pathname.split('/')[1];
  const map: Record<string, ModuleId> = {
    shops: 'shops', products: 'products', import: 'import',
    'ai-products': 'ai-products', multichannel: 'multichannel',
    inventory: 'inventory', orders: 'orders', market: 'market',
    reports: 'reports', settings: 'settings', team: 'team',
  };
  return map[seg] ?? null;
}

// Legacy 'admin' role (seeded earlier) is treated as owner.
export function normalizeRole(role: string): Role {
  if (role === 'admin') return 'owner';
  if (role === 'owner' || role === 'manager' || role === 'staff' || role === 'accountant') return role;
  return 'staff';
}

export function canAccess(role: string, module: ModuleId): boolean {
  return ROLE_MODULES[normalizeRole(role)].includes(module);
}

// Only owner can manage the team (invite/change roles/remove members).
export function canManageTeam(role: string): boolean {
  return normalizeRole(role) === 'owner';
}
