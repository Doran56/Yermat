import { Badge } from './Badge';

type Status = 'approved' | 'pending' | 'rejected' | 'unverified';

interface StatusBadgeProps {
  status: Status;
}

const STATUS_CONFIG: Record<Status, { label: string; variant: 'success' | 'muted' | 'danger' }> = {
  approved:   { label: 'Certifiée ✓',   variant: 'success' },
  pending:    { label: 'En attente',     variant: 'muted' },
  unverified: { label: 'Non certifiée', variant: 'muted' },
  rejected:   { label: 'Rejetée',       variant: 'danger' },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.pending;
  return <Badge label={cfg.label} variant={cfg.variant} />;
}
