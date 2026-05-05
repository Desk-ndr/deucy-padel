import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingStateProps {
  message?: string;
  compact?: boolean;
}

export function LoadingState({ message, compact = false }: LoadingStateProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 justify-center py-4">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        {message && <span className="text-sm text-muted-foreground">{message}</span>}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <Loader2 className="h-12 w-12 animate-spin text-muted-foreground mb-4" />
      {message && <p className="text-muted-foreground text-center">{message}</p>}
    </div>
  );
}
