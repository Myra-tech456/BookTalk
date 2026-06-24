import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type AppLayoutProps = {
  title: string;
  children: React.ReactNode;
};

function getRoleLabel(role: string | null) {
  if (role === "superadmin") return "Super admin";
  if (role === "admin") return "Admin";
  return "Membre";
}

export default function AppLayout({ title, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { role, user } = useAuth();
  const navigate = useNavigate();

  const isSuperAdmin = role === "superadmin";

  const handleLogout = async () => {
    await supabase.auth.signOut({ scope: "local" });
    navigate("/login");
  };

  const linkBase =
    "flex items-center rounded-xl px-4 py-3 text-sm font-medium transition";
  const linkInactive = "text-slate-300 hover:bg-slate-800 hover:text-white";
  const linkActive =
    "border border-violet-500/30 bg-violet-600/20 text-violet-300";

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {sidebarOpen && (
        <button
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fermer le menu"
        />
      )}

      <aside
        className={`fixed left-0 top-0 z-40 flex h-screen w-72 flex-col overflow-hidden border-r border-slate-800 bg-slate-900/95 backdrop-blur transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">
              Groupe de lecture
            </p>
            <h1 className="text-2xl font-bold text-violet-400">BookTalk</h1>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white lg:hidden"
            aria-label="Fermer la barre latérale"
          >
            ✕
          </button>
        </div>

        <div className="border-b border-slate-800 px-5 py-4">
          <p className="text-sm text-slate-400">Connecté</p>
          <p className="mt-1 truncate text-base font-semibold text-white">
            {user?.email}
          </p>

          <span
            className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
              role === "superadmin"
                ? "bg-amber-400/20 text-amber-300"
                : role === "admin"
                ? "bg-blue-500/20 text-blue-300"
                : "bg-slate-700 text-slate-200"
            }`}
          >
            {getRoleLabel(role)}
          </span>
        </div>

        <nav className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            Dashboard
          </NavLink>

          <NavLink
            to="/announcements"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            Annonces
          </NavLink>

          <NavLink
            to="/polls"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            Sondages
          </NavLink>

          <NavLink
            to="/forms"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            Formulaires
          </NavLink>

          <NavLink
            to="/library"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            Bibliothèque
          </NavLink>

          <NavLink
            to="/events"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : linkInactive}`
            }
            onClick={() => setSidebarOpen(false)}
          >
            Événements
          </NavLink>

          {isSuperAdmin && (
            <NavLink
              to="/superadmin"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : linkInactive}`
              }
              onClick={() => setSidebarOpen(false)}
            >
              Superadmin
            </NavLink>
          )}

        
        </nav>

        <div className="border-t border-slate-800 p-4 pb-6">
          <button
            onClick={handleLogout}
            className="w-full rounded-xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-500"
          >
            Se déconnecter
          </button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-800 bg-slate-950/90 px-4 py-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg border border-slate-700 px-3 py-2 text-slate-200 hover:bg-slate-800 lg:hidden"
              aria-label="Ouvrir le menu"
            >
              ☰
            </button>

            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-slate-500">
                BookTalk
              </p>
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-400">Statut</p>
            <p className="text-sm font-medium text-slate-200">
              {getRoleLabel(role)}
            </p>
          </div>
        </header>

        <main className="px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}