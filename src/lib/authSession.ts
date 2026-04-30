export function clearStoredSession() {
  const keysToRemove = [
    "user",
    "role",
    "token",
    "is_allocated_mentor",
  ];

  keysToRemove.forEach((key) => {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  });
}

export function normalizeRole(rawRole: unknown): string {
  let role = String(rawRole || "student").toLowerCase().trim();

  if (["assistant professor", "associate professor", "professor", "faculty", "teacher", "lecturer"].includes(role)) {
    role = "faculty";
  }

  return role.replace(/\s+/g, "-").replace(/_/g, "-");
}

export function getAllowedRoles(user: Record<string, any> | null | undefined): string[] {
  const rawRoles = Array.isArray(user?.allowed_roles) ? user.allowed_roles : [];
  const normalized = rawRoles
    .map((role) => normalizeRole(role))
    .filter(Boolean);

  const unique = Array.from(new Set(normalized));
  return unique;
}

export function hasRole(user: Record<string, any> | null | undefined, role: string): boolean {
  const normalizedTarget = normalizeRole(role);
  const allowed = getAllowedRoles(user);
  const active = normalizeRole(user?.role || user?.designation || "");

  if (normalizedTarget === "faculty") {
    return active === "faculty" || allowed.some((value) => ["mentor", "subject-handler", "hod"].includes(value));
  }

  return active === normalizedTarget || allowed.includes(normalizedTarget);
}

export function persistUserSession(nextUser: Record<string, any>) {
  const normalizedRole = normalizeRole(nextUser?.role);
  const allowedRoles = Array.from(
    new Set(
      (Array.isArray(nextUser?.allowed_roles) ? nextUser.allowed_roles : [])
        .map((role: unknown) => normalizeRole(role))
        .filter(Boolean)
    )
  );

  const userToStore = {
    ...nextUser,
    role: normalizedRole,
    allowed_roles: allowedRoles,
  };

  localStorage.setItem("user", JSON.stringify(userToStore));
  localStorage.setItem("role", normalizedRole);
  localStorage.setItem("is_allocated_mentor", String(allowedRoles.includes("mentor")));
  window.dispatchEvent(new Event("auth-session-changed"));
}
