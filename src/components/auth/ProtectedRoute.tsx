import { Navigate, Outlet } from 'react-router-dom';
import { usePlayer } from '@/contexts/PlayerContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute() {
  const { player, isLoading } = usePlayer();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!player) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
