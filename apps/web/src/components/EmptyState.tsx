import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

const EmptyState = ({
  icon = "📭",
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) => {
  if (compact) {
    return (
      <div className="flex flex-col items-center gap-1.5 py-6 text-center">
        <span className="text-2xl" role="img" aria-label={title}>{icon}</span>
        <p className="text-sm font-medium text-foreground">{title}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {action && (
          <Button
            variant="outline"
            size="sm"
            className="mt-1.5 h-7 text-xs"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted text-3xl shadow-inner">
        <span role="img" aria-label={title}>{icon}</span>
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        {description && (
          <p className="max-w-xs text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      {action && (
        <Button variant="default" size="sm" className="h-8 text-xs" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
