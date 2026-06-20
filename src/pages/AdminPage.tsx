import { useAuth } from "../context/AuthContext";

export default function AdminPage() {
  const { role } = useAuth();

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-5xl rounded-2xl bg-slate-900 p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-violet-400">Panneau admin</h1>
        <p className="mt-4 text-slate-300">
          Accès autorisé pour les admins et superadmins.
        </p>
        <p className="mt-2 text-slate-400">Rôle actuel : {role}</p>
      </div>
    </main>
  );
}