import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Phase 1 mock role switcher. Real SSO replaces this provider later —
 * consumers only read { role, team, can }, so the swap is contained here.
 *
 * Scopes:
 *  - dev:   team-scoped; creates & approves for their repos
 *  - em:    org-wide across all teams; manages campaigns (create/approve)
 *  - cyber: org-wide, read-only, security campaigns only (category === "security")
 */

export type Role = "dev" | "em" | "cyber";

export const ROLE_LABELS: Record<Role, string> = {
  dev: "Developer",
  em: "Engineering Manager",
  cyber: "Cyber Security",
};

const ROLES: Role[] = ["dev", "em", "cyber"];

interface RoleState {
  role: Role;
  /** Acting team — only meaningful for dev; em/cyber are org-wide. */
  team: string;
  setRole: (r: Role) => void;
  setTeam: (t: string) => void;
  can: { create: boolean; approve: boolean };
}

const RoleContext = createContext<RoleState | null>(null);

const STORAGE_KEY = "devflo.role";

export function RoleProvider({ children }: { children: ReactNode }) {
  const stored = (() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    } catch {
      return {};
    }
  })();

  // Validate stored values — e.g. the removed "stakeholder" role falls back to dev.
  const [role, setRoleState] = useState<Role>(ROLES.includes(stored.role) ? stored.role : "dev");
  const [team, setTeamState] = useState<string>(stored.team ?? "platform-team");

  const setRole = (r: Role) => {
    setRoleState(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role: r, team }));
  };
  const setTeam = (t: string) => {
    setTeamState(t);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ role, team: t }));
  };

  const value = useMemo<RoleState>(
    () => ({
      role,
      team,
      setRole,
      setTeam,
      // Cyber Security is strictly read-only — no operational controls.
      can: { create: role !== "cyber", approve: role !== "cyber" },
    }),
    [role, team]
  );

  return <RoleContext.Provider value={value}>{children}</RoleContext.Provider>;
}

export function useRole(): RoleState {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole outside RoleProvider");
  return ctx;
}
