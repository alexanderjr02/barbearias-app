// SQLite (Prisma) has no native enum support, so roles are validated as a
// TypeScript union at the application layer instead of a DB-level enum.
export const ROLES = ["SUPER_ADMIN", "OWNER", "MANAGER", "BARBER", "CLIENT"] as const;

export type Role = (typeof ROLES)[number];

export function isRole(value: string): value is Role {
  return (ROLES as readonly string[]).includes(value);
}
