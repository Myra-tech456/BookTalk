import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type SuperAdminRouteProps = {
  children: React.ReactNode;
};

export default function SuperAdminRoute({
  children,
}: SuperAdminRouteProps) {
  const { user, loading, role } = useAuth();

  if (loading) {
    return <div className="p-6">Chargement...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}