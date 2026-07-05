import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

/**
 * Phase 1 mock role switcher. Real SSO replaces this provider later —
 * consumers only read { role, team, can }, so the swap is contained here.
 */

export type Role = "dev" | "em" | "stakeholder";

export const ROLE_LABELS: Record<Role, string> = {
  dev: "Developer",
  em: "Engineering Manager",
  stakeholder: "Stakeholder / Security",
};

interface RoleState {
  role: Role;
  /** Acting team for dev/em; ignored for stakeholder. */
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

  const [role, setRoleState] = useState<Role>(stored.role ?? "dev");
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
      // Stakeholder view is strictly read-only — no operational controls.
      can: { create: role !== "stakeholder", approve: role !== "stakeholder" },
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
