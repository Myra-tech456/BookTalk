import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
};

export default function SuperAdminPage() {
  const { role, user } = useAuth();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const loadProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement profils :", error.message);
    } else {
      setProfiles(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  const handleChangeRole = async (
    userId: string,
    newRole: "admin" | "member"
  ) => {
    try {
      setActionLoadingId(userId);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        alert("Aucune session trouvée.");
        return;
      }

      const { data, error } = await supabase.functions.invoke("manage-role", {
        body: {
          userId,
          role: newRole,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      console.log("Réponse fonction manage-role :", { data, error });

      if (error) {
        alert(error.message || "Erreur lors du changement de rôle.");
        return;
      }

      alert(
        `Rôle mis à jour vers "${newRole}". L'utilisateur devra se reconnecter.`
      );

      await loadProfiles();
    } catch (error) {
      console.error("Erreur réseau :", error);
      alert("Erreur réseau ou fonction introuvable.");
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <div className="mx-auto max-w-6xl rounded-2xl bg-slate-900 p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-amber-400">
          Panneau super admin
        </h1>

        <p className="mt-2 text-slate-400">
          Rôle actuel : {role === "superadmin" ? "Super admin" : role}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          Seul le super admin peut modifier les rôles.
        </p>

        {loading ? (
          <p className="mt-6 text-slate-300">Chargement des utilisateurs...</p>
        ) : (
          <div className="mt-8 overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-700 text-left">
                  <th className="p-3">Pseudo</th>
                  <th className="p-3">Nom complet</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Inscription</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {profiles.map((profile) => {
                  const isCurrentUser = profile.id === user?.id;
                  const isLoadingThisRow = actionLoadingId === profile.id;

                  return (
                    <tr key={profile.id} className="border-b border-slate-800">
                      <td className="p-3">{profile.username || "Sans pseudo"}</td>
                      <td className="p-3">{profile.full_name || "—"}</td>
                      <td className="p-3 text-xs text-slate-400">{profile.id}</td>
                      <td className="p-3">
                        {new Date(profile.created_at).toLocaleString()}
                      </td>
                      <td className="p-3">
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleChangeRole(profile.id, "admin")}
                            disabled={isCurrentUser || isLoadingThisRow}
                            className="rounded bg-blue-600 px-3 py-1 text-sm font-medium hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoadingThisRow
                              ? "Chargement..."
                              : "Promouvoir admin"}
                          </button>

                          <button
                            onClick={() => handleChangeRole(profile.id, "member")}
                            disabled={isCurrentUser || isLoadingThisRow}
                            className="rounded bg-slate-700 px-3 py-1 text-sm font-medium hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isLoadingThisRow
                              ? "Chargement..."
                              : "Remettre membre"}
                          </button>
                        </div>

                        {isCurrentUser && (
                          <p className="mt-2 text-xs text-slate-500">
                            Tu ne peux pas modifier ton propre rôle ici.
                          </p>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}