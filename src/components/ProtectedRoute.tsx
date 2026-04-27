import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import type { AppRole } from "@/integrations/supabase/database-types";

interface Props {
  children: React.ReactNode;
  allow?: AppRole[];
}

export const ProtectedRoute = ({ children, allow }: Props) => {
  const { user, loading, roles } = useAuth();
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Carregando...</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (allow && !roles.some((r) => allow.includes(r))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};
