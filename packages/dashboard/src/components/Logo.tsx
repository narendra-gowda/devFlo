/** devFlo mark — two connected nodes (variant 5, both outlined). */
export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 28 28"
      fill="none"
      style={{ filter: "drop-shadow(0 0 9px rgba(139,124,247,.45))" }}
      aria-label="devFlo"
    >
      <rect x="4" y="4" width="9" height="9" rx="2.5" stroke="var(--color-accent)" strokeWidth="2" />
      <path
        d="M8.5 13 V17.5 Q8.5 19.5 10.5 19.5 H14"
        stroke="var(--color-accent)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <rect x="14" y="14.5" width="10" height="10" rx="3" stroke="var(--color-accent)" strokeWidth="2" />
    </svg>
  );
}
