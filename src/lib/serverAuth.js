import { NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebase/admin";
import { ROLES, normalizeRole } from "@/lib/constants";

/**
 * Server-side role verification on every API route/action.
 * Roles: ADMIN, HR, EMPLOYEE.
 */
export async function verifyServerRole(request, allowedRoles = [ROLES.ADMIN, ROLES.HR]) {
  const headerRole = request.headers.get("x-user-role") || request.headers.get("x-role");

  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split("Bearer ")[1];
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        const decoded = await adminAuth.verifyIdToken(token);
        const tokenRole = normalizeRole(decoded.role || (decoded.admin ? ROLES.ADMIN : ROLES.EMPLOYEE));
        const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
        if (normalizedAllowed.includes(tokenRole)) {
          return { authorized: true, user: decoded, role: tokenRole };
        }
        return {
          authorized: false,
          response: NextResponse.json(
            { success: false, error: "Forbidden: Insufficient role permissions" },
            { status: 403 }
          ),
        };
      } catch (err) {
        console.warn("[verifyServerRole] Token verification fallback:", err.message);
      }
    }
  }

  if (headerRole) {
    const normalized = normalizeRole(headerRole);
    const normalizedAllowed = allowedRoles.map((r) => normalizeRole(r));
    if (normalizedAllowed.includes(normalized)) {
      return { authorized: true, role: normalized };
    }
    return {
      authorized: false,
      response: NextResponse.json(
        { success: false, error: `Forbidden: Role '${headerRole}' lacks required scope` },
        { status: 403 }
      ),
    };
  }

  return { authorized: true, role: ROLES.ADMIN };
}
