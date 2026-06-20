import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AdminRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, role } = useAuth();

  if (loading) return <div className="p-6">Chargement...</div>;
  if (!user) return <Navigate to="/login" replace />;

  if (role !== "admin" && role !== "superadmin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}