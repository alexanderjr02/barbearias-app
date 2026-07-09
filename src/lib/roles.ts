// SQLite (Prisma) has no native enum support, so roles are validated as a
// TypeScript union at the application layer instead of a DB-level enum.
// SUPPORT_ADMIN is a scoped platform-admin role: Dashboard + Analytics
// (read-only) and Suporte (full) — everything else in /admin stays
// SUPER_ADMIN-only (see requireAnyAdminSession() vs requireSuperAdminSession()
// in src/lib/apiAuth.ts).
export const ROLES = ["SUPER_ADMIN", "SUPPORT_ADMIN", "OWNER", "MANAGER", "BARBER", "CLIENT"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
