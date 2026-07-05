import { Link, NavLink } from "react-router-dom";
import { Plus, Workflow } from "lucide-react";
import type { ReactNode } from "react";
import { ROLE_LABELS, useRole, type Role } from "../context/role";

const TEAMS = ["platform-team", "payments-team", "mobile-team"];

function RoleSwitcher() {
  const { role, team, setRole, setTeam } = useRole();
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-xs text-slate-400 hidden sm:inline">Viewing as</span>
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as Role)}
        className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
        aria-label="Role"
      >
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {role !== "stakeholder" && (
        <select
          value={team}
          onChange={(e) => setTeam(e.target.value)}
          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-sm"
          aria-label="Team"
        >
          {TEAMS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { can } = useRole();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center gap-6 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 font-semibold text-slate-900">
            <Workflow className="h-5 w-5 text-blue-600" />
            devFlo
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              Phase 1 · local
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <NavLink
              to="/"
              className={({ isActive }) =>
                isActive ? "font-medium text-blue-700" : "text-slate-600 hover:text-slate-900"
              }
            >
              Campaigns
            </NavLink>
            <NavLink
              to="/alerts"
              className={({ isActive }) =>
                isActive ? "font-medium text-blue-700" : "text-slate-600 hover:text-slate-900"
              }
            >
              Security alerts
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            {can.create && (
              <Link
                to="/campaigns/new"
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" /> Create campaign
              </Link>
            )}
            <RoleSwitcher />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6">{children}</main>
    </div>
  );
}
