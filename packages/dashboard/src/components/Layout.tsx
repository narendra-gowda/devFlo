import { NavLink } from "react-router-dom";
import {
  CheckCircle2,
  LayoutGrid,
  Settings,
  ShieldAlert,
  CircleDashed,
  Users,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";
import { ROLE_LABELS, useRole, type Role } from "../context/role";
import { useCampaigns, useRepos } from "../api/hooks";
import { teamRepoKeys, visibleCampaigns, visibleItems } from "../lib/roles";
import { ATTENTION_STATUSES } from "@devflo/schema";
import { Logo } from "./Logo";

const TEAMS = ["platform-team", "payments-team", "mobile-team"];

const navBase =
  "flex items-center gap-2.5 rounded-[7px] px-2.5 py-[7px] text-[13px] font-medium text-muted hover:text-ink";
const navActive =
  "bg-[#1d1f29] text-ink shadow-[inset_0_0_0_1px_var(--color-edge2),inset_3px_0_0_var(--color-accent)]";

function QueueBadge({ count, tone }: { count: number; tone: "warn" | "danger" }) {
  if (count === 0) return null;
  const cls =
    tone === "warn"
      ? "bg-warn/15 text-warn shadow-[0_0_0_1px_rgba(245,177,83,.3),0_0_12px_-2px_rgba(245,177,83,.35)]"
      : "bg-danger/15 text-danger shadow-[0_0_0_1px_rgba(241,106,106,.3),0_0_12px_-2px_rgba(241,106,106,.4)]";
  return (
    <span className={`ml-auto rounded-full px-[7px] py-px text-[10px] font-bold leading-normal ${cls}`}>
      {count}
    </span>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="px-[18px] pb-[5px] pt-4 text-[10px] font-medium uppercase tracking-[.1em] text-dim">
      {children}
    </div>
  );
}

function RoleSwitcher() {
  const { role, team, setRole, setTeam } = useRole();
  const selectCls =
    "mt-1.5 w-full rounded-[7px] border border-edge2 bg-panel2 px-2 py-1.5 text-xs text-ink";
  return (
    <div className="shrink-0 border-t border-edge px-3.5 py-3 text-[11.5px] text-dim">
      Viewing as
      <select value={role} onChange={(e) => setRole(e.target.value as Role)} className={selectCls} aria-label="Role">
        {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
          <option key={r} value={r}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </select>
      {role === "dev" && (
        <select value={team} onChange={(e) => setTeam(e.target.value)} className={selectCls} aria-label="Team">
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

function Sidebar() {
  const { role, team } = useRole();
  const campaignsQ = useCampaigns();
  const reposQ = useRepos();

  // Live queue counts, scoped to the current role — same derivation the pages use.
  let pending = 0;
  let attention = 0;
  if (campaignsQ.data && reposQ.data) {
    const teamRepos = teamRepoKeys(reposQ.data, team);
    for (const c of visibleCampaigns(campaignsQ.data.campaigns, role, teamRepos)) {
      for (const i of visibleItems(c, role, teamRepos)) {
        if (i.status === "PENDING_APPROVAL") pending++;
        else if (ATTENTION_STATUSES.includes(i.status)) attention++;
      }
    }
  }

  const link = ({ isActive }: { isActive: boolean }) => `${navBase} ${isActive ? navActive : ""}`;

  return (
    <aside className="flex h-full min-h-0 flex-col overflow-hidden border-r border-edge bg-panel">
      <div className="flex items-center gap-2.5 border-b border-edge px-3.5 py-4">
        <Logo />
        <span className="text-[14.5px] font-bold leading-[1.15] text-ink">
          devFlo
          <small className="block text-[9.5px] font-medium tracking-[.09em] text-dim">
            INTERNAL DEV PLATFORM
          </small>
        </span>
      </div>
      <nav className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto p-2">
        <NavLink to="/" end className={link}>
          <LayoutGrid className="h-4 w-4" /> Campaigns
        </NavLink>
        <NavLink to="/alerts" className={link}>
          <ShieldAlert className="h-4 w-4" /> Security alerts
        </NavLink>

        <SectionLabel>Queues</SectionLabel>
        <NavLink to="/queues/approvals" className={link}>
          <CircleDashed className="h-4 w-4" /> Awaiting approval
          <QueueBadge count={pending} tone="warn" />
        </NavLink>
        <NavLink to="/queues/attention" className={link}>
          <XCircle className="h-4 w-4" /> Needs attention
          <QueueBadge count={attention} tone="danger" />
        </NavLink>
        <NavLink to="/queues/completed" className={link}>
          <CheckCircle2 className="h-4 w-4" /> Completed
        </NavLink>

        <SectionLabel>Admin</SectionLabel>
        <span className={`${navBase} cursor-not-allowed opacity-45`} title="Adapter registry arrives in Phase 3/4">
          <Settings className="h-4 w-4" /> Adapters
        </span>
        <span className={`${navBase} cursor-not-allowed opacity-45`} title="RBAC arrives in Phase 4">
          <Users className="h-4 w-4" /> Teams &amp; roles
        </span>
      </nav>
      <RoleSwitcher />
    </aside>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  return (
    // h-screen + overflow-hidden pins the app to the viewport: the sidebar
    // keeps a fixed height (role switcher always visible) and only the
    // content pane scrolls.
    <div className="grid h-screen grid-cols-[232px_1fr] overflow-hidden">
      <Sidebar />
      <main className="min-w-0 overflow-y-auto px-7 py-[22px]">{children}</main>
    </div>
  );
}
