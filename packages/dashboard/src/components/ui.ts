/** Shared class strings for the Midnight theme. */
export const btnPrimary =
  "cursor-pointer rounded-[7px] bg-accent px-3.5 py-1.5 text-[12.5px] font-semibold text-[#0d0a1f] shadow-[0_0_20px_-4px_rgba(139,124,247,.5)] transition-shadow hover:bg-[#978af8] hover:shadow-[0_0_26px_-2px_rgba(139,124,247,.8)] disabled:cursor-not-allowed disabled:opacity-50";

export const btnGhost =
  "cursor-pointer rounded-[7px] border border-edge2 bg-panel2 px-3 py-1.5 text-[12.5px] text-muted hover:text-ink disabled:cursor-not-allowed disabled:opacity-50";

export const input =
  "w-full rounded-[7px] border border-edge2 bg-panel2 px-3 py-1.5 text-sm text-ink placeholder:text-dim focus:border-accent focus:outline-none";

export const panel = "rounded-[10px] border border-edge bg-panel";

export const thBase =
  "px-4 py-2 text-left text-[10.5px] font-semibold uppercase tracking-[.07em] text-dim";

/** Centered variant — don't combine thBase with `text-center` (conflicting utilities). */
export const thCenter = thBase.replace("text-left", "text-center");

export const pageTitle = "text-[17px] font-semibold tracking-tight text-ink";
