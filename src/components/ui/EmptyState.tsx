import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon: React.ElementType;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 gap-4">
      <div className="flex flex-col items-center gap-3 max-w-sm">
        <Icon className="h-12 w-12 text-muted-foreground" />
        <div className="text-center">
          <h2 className="font-semibold text-foreground mb-1">{title}</h2>
          {description && <p className="text-sm text-muted-foreground">{description}</p>}
        </div>
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
