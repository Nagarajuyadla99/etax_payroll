/** Canonical role slugs (must match backend JWT /users/me). */
export const R = {
  ADMIN: "admin",
  HR: "hr",
  EMPLOYEE: "employee",
};

export const ANY = [R.ADMIN, R.HR, R.EMPLOYEE];
export const STAFF = [R.ADMIN, R.HR];
export const ADMIN = [R.ADMIN];

export function normalizeRole(role) {
  if (role == null || typeof role !== "string") return null;
  const s = role.trim().toLowerCase();
  return s || null;
}
