// Survey service roles utility
export type AssignmentRole = "OWNER" | "ADMIN" | "MANAGER" | "EDITOR" | "USER" | "VIEWER";

const rank: Record<AssignmentRole, number> = {
  OWNER: 6, 
  ADMIN: 5, 
  MANAGER: 4, 
  EDITOR: 3, 
  USER: 2, 
  VIEWER: 1,
};

/**
 * Check if current role has at least the required permission level
 * @param current - Current user's role
 * @param needed - Minimum required role
 * @returns true if user has sufficient permissions
 */
export function hasAtLeast(current: AssignmentRole | undefined, needed: AssignmentRole): boolean {
  return !!current && rank[current] >= rank[needed];
}

/**
 * Get all roles that are at least the specified level
 * @param minRole - Minimum role level
 * @returns Array of roles that meet or exceed the minimum
 */
export function getRolesAtLeast(minRole: AssignmentRole): AssignmentRole[] {
  return Object.keys(rank).filter(role => 
    rank[role as AssignmentRole] >= rank[minRole]
  ) as AssignmentRole[];
}

/**
 * Check if a role can perform a specific action
 * Survey Builder specific permissions:
 * - OWNER/ADMIN: Full access including settings, publishing, member management
 * - MANAGER: Create, edit, publish surveys; manage survey settings
 * - EDITOR: Create and edit surveys; cannot publish or manage settings
 * - USER: Edit assigned surveys; limited creation
 * - VIEWER: Read-only access
 */
export function canPerformAction(role: AssignmentRole | undefined, action: string): boolean {
  if (!role) return false;
  
  switch (action) {
    case "survey:create":
      return hasAtLeast(role, "EDITOR");
    case "survey:edit":
      return hasAtLeast(role, "EDITOR");
    case "survey:delete":
      return hasAtLeast(role, "MANAGER");
    case "survey:publish":
      return hasAtLeast(role, "MANAGER");
    case "survey:settings":
      return hasAtLeast(role, "ADMIN");
    case "survey:view":
      return hasAtLeast(role, "VIEWER");
    default:
      return false;
  }
}
