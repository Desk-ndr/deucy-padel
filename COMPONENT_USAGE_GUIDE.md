# Standardized Loading, Error, and Empty State Components

Three new presentational components for consistent state handling across the app.

## LoadingState

Full-screen or compact loading spinner with optional message.

**Full-screen usage:**
```tsx
import { LoadingState } from '@/components/ui/LoadingState';

<LoadingState message="Caricamento in corso..." />
// or without message:
<LoadingState />
```

**Compact inline usage:**
```tsx
<LoadingState compact message="Caricamento..." />
```

**Props:**
- `message?: string` — Optional loading text
- `compact?: boolean` — Compact inline variant (default: false)

---

## ErrorState

Centered error display with optional retry button.

```tsx
import { ErrorState } from '@/components/ui/ErrorState';

<ErrorState 
  message="Impossibile caricare i dati"
  onRetry={() => loadLeaderboard()}
/>
// or without retry:
<ErrorState message="Errore di connessione" />
```

**Props:**
- `message: string` — Error message (required)
- `onRetry?: () => void` — Optional retry callback (shows "Riprova" button if provided)

---

## EmptyState

Centered empty state with icon, title, optional description, and optional action button.

```tsx
import { EmptyState } from '@/components/ui/EmptyState';
import { Trophy, Users, Gavel } from 'lucide-react';

// Minimal:
<EmptyState icon={Trophy} title="Nessun match in programma" />

// Full:
<EmptyState
  icon={Users}
  title="Nessun giocatore trovato"
  description="Aggiungi i tuoi amici per iniziare"
  action={{ label: "Aggiungi giocatore", onClick: () => navigate('/add') }}
/>
```

**Props:**
- `icon: React.ElementType` — Lucide icon component (required)
- `title: string` — Main headline (required)
- `description?: string` — Longer subtitle
- `action?: { label: string; onClick: () => void }` — Optional CTA button

---

## Design Notes

All three components:
- Use Tailwind classes consistent with shadcn/ui dark theme
- Full-screen variants use `min-h-screen` for proper viewport fill
- Compact variant uses `py-4` for inline spacing
- Secondary text uses `text-muted-foreground` (gray)
- Error icon uses `text-destructive` (red)
- Buttons use shadcn `Button` with `variant="outline"` and `size="sm"`
- Max-width container is `max-w-sm` for good readability
- Responsive padding with `px-4` for mobile (375px+)
- Gap-based spacing for consistency

---

## Migration Examples

### Before (inconsistent):
```tsx
if (isLoading) {
  return <div className="text-4xl animate-pulse">🏆</div>
}
if (error) {
  return <div>Errore: {error}</div>
}
if (players.length === 0) {
  return <p>Nessun giocatore</p>
}
```

### After (standardized):
```tsx
import { LoadingState, ErrorState, EmptyState } from '@/components/ui';
import { Trophy } from 'lucide-react';

if (isLoading) {
  return <LoadingState message="Caricamento classifica..." />
}
if (error) {
  return <ErrorState message={error} onRetry={loadLeaderboard} />
}
if (players.length === 0) {
  return <EmptyState icon={Trophy} title="Nessun giocatore" />
}
```
