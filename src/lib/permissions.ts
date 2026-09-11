// Logica pura de permissoes (sem dependencia de servidor/DB) — testavel isolada.
import type { UserRole } from "@prisma/client";

export type Permission =
  | "products:read" | "products:write" | "products:delete"
  | "customers:read" | "customers:write" | "customers:delete"
  | "suppliers:read" | "suppliers:write" | "suppliers:delete"
  | "stock:read" | "stock:write"
  | "cash:read" | "cash:write"
  | "branches:read" | "branches:write"
  | "purchases:read" | "purchases:write"
  | "sales:read" | "sales:write"
  | "finance:read" | "finance:write"
  | "users:manage"
  | "billing:read" | "billing:manage"
  | "lgpd:manage"
  | "reports:read"
  | "audit:read"
  | "settings:manage";

const ALL: Permission[] = [
  "products:read", "products:write", "products:delete",
  "customers:read", "customers:write", "customers:delete",
  "suppliers:read", "suppliers:write", "suppliers:delete",
  "stock:read", "stock:write",
  "cash:read", "cash:write",
  "branches:read", "branches:write",
  "purchases:read", "purchases:write",
  "sales:read", "sales:write",
  "finance:read", "finance:write",
  "users:manage", "billing:read", "billing:manage", "lgpd:manage", "reports:read", "audit:read", "settings:manage",
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  PLATFORM_ADMIN: ALL,
  OWNER: ALL,
  ADMIN: ALL,
  MANAGER: [
    "products:read", "products:write",
    "customers:read", "customers:write", "customers:delete",
    "suppliers:read", "suppliers:write", "suppliers:delete",
    "stock:read", "stock:write",
    "cash:read", "cash:write",
    "branches:read",
    "reports:read",
    "billing:read",
    "purchases:read", "purchases:write",
    "sales:read", "sales:write",
    "finance:read", "finance:write",
    "audit:read",
  ],
  SELLER: ["products:read", "customers:read", "customers:write", "stock:read", "cash:read", "cash:write", "branches:read", "sales:read", "sales:write"],
  STOCKIST: ["products:read", "products:write", "suppliers:read", "stock:read", "stock:write", "branches:read", "purchases:read", "purchases:write"],
  FINANCE: ["customers:read", "suppliers:read", "products:read", "finance:read", "finance:write", "cash:read", "branches:read", "reports:read", "billing:read", "sales:read", "purchases:read", "audit:read"],
  MEMBER: ["products:read", "customers:read", "suppliers:read", "stock:read", "cash:read", "branches:read", "sales:read", "purchases:read", "finance:read"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
