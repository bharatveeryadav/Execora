import type { ReactNode } from 'react';

type BadgeVariant = 'gray' | 'green' | 'yellow' | 'red' | 'blue' | 'indigo' | 'purple';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  dot?: boolean;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  gray:   'bg-gray-100 text-gray-700',
  green:  'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red:    'bg-red-100 text-red-700',
  blue:   'bg-blue-100 text-blue-700',
  indigo: 'bg-indigo-100 text-indigo-700',
  purple: 'bg-purple-100 text-purple-700',
};

const dotClasses: Record<BadgeVariant, string> = {
  gray:   'bg-gray-500',
  green:  'bg-emerald-500',
  yellow: 'bg-amber-500',
  red:    'bg-red-500',
  blue:   'bg-blue-500',
  indigo: 'bg-indigo-500',
  purple: 'bg-purple-500',
};

export function Badge({ children, variant = 'gray', dot, className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotClasses[variant]}`} />}
      {children}
    </span>
  );
}

// Helper to map invoice status → badge variant
export function InvoiceStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    draft: 'gray', issued: 'blue', paid: 'green', cancelled: 'red',
  };
  return <Badge variant={map[status] ?? 'gray'} dot>{status}</Badge>;
}

export function ReminderStatusBadge({ status }: { status: string }) {
  const map: Record<string, BadgeVariant> = {
    pending: 'yellow', sent: 'green', failed: 'red', cancelled: 'gray',
  };
  return <Badge variant={map[status] ?? 'gray'} dot>{status}</Badge>;
}

export function LiveBadge({ connected }: { connected: boolean }) {
  return (
    <Badge variant={connected ? 'green' : 'gray'} dot>
      {connected ? 'Live' : 'Disconnected'}
    </Badge>
  );
}
