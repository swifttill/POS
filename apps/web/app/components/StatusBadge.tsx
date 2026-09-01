export function StatusBadge({ tone="neutral", children }: { tone?: "neutral"|"success"|"warning"|"danger"; children: React.ReactNode }) {
  return <span className={`statusBadge statusBadge-${tone}`}>{children}</span>;
}
