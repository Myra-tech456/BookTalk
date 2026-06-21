import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Announcement = {
  id: string;
  title: string;
  content: string | null;
  is_pinned: boolean;
  created_by: string;
  created_at: string;
  expires_at: string | null;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type VisibilityOption = "2weeks" | "1month" | "1year" | "forever";

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getExpiryLabel(option: VisibilityOption) {
  switch (option) {
    case "2weeks":
      return "2 semaines";
    case "1month":
      return "1 mois";
    case "1year":
      return "1 an";
    case "forever":
      return "Forever";
    default:
      return "Forever";
  }
}

function computeExpiresAt(option: VisibilityOption) {
  if (option === "forever") return null;

  const now = new Date();

  if (option === "2weeks") {
    now.setDate(now.getDate() + 14);
  } else if (option === "1month") {
    now.setMonth(now.getMonth() + 1);
  } else if (option === "1year") {
    now.setFullYear(now.getFullYear() + 1);
  }

  return now.toISOString();
}

function getVisibilityOptionFromExpiresAt(
  createdAt: string,
  expiresAt: string | null
): VisibilityOption {
  if (!expiresAt) return "forever";

  const created = new Date(createdAt).getTime();
  const expires = new Date(expiresAt).getTime();
  const diffDays = Math.round((expires - created) / (1000 * 60 * 60 * 24));

  if (diffDays <= 15) return "2weeks";
  if (diffDays <= 40) return "1month";
  if (diffDays <= 370) return "1year";
  return "forever";
}

export default function AnnouncementsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin" || role === "superadmin";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [selectedAnnouncement, setSelectedAnnouncement] =
    useState<Announcement | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [visibility, setVisibility] = useState<VisibilityOption>("1month");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editPinned, setEditPinned] = useState(false);
  const [editVisibility, setEditVisibility] =
    useState<VisibilityOption>("1month");
  const [updating, setUpdating] = useState(false);

  const loadAnnouncements = async () => {
    setLoading(true);

    const nowIso = new Date().toISOString();

    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .or(`expires_at.is.null,expires_at.gte.${nowIso}`)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur annonces :", error.message);
      setLoading(false);
      return;
    }

    const announcementsData = (data || []) as Announcement[];
    setAnnouncements(announcementsData);

    const authorIds = [...new Set(announcementsData.map((a) => a.created_by))];

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", authorIds);

      if (!profilesError && profilesData) {
        const map: Record<string, string> = {};
        profilesData.forEach((profile: Profile) => {
          map[profile.id] =
            profile.username || profile.full_name || "Utilisateur";
        });
        setProfilesMap(map);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const totalAnnouncements = announcements.length;
  const pinnedAnnouncements = useMemo(
    () => announcements.filter((a) => a.is_pinned).length,
    [announcements]
  );

  const resetCreateForm = () => {
    setTitle("");
    setContent("");
    setIsPinned(false);
    setVisibility("1month");
  };

  const handleCreateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!title.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }

    setSubmitting(true);

    const expiresAt = computeExpiresAt(visibility);

    const { error } = await supabase.from("announcements").insert({
      title: title.trim(),
      content: content.trim() || null,
      is_pinned: isPinned,
      expires_at: expiresAt,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetCreateForm();
    setIsCreateModalOpen(false);
    loadAnnouncements();
  };

  const openEditModal = (announcement: Announcement) => {
    setEditingId(announcement.id);
    setEditTitle(announcement.title);
    setEditContent(announcement.content || "");
    setEditPinned(announcement.is_pinned);
    setEditVisibility(
      getVisibilityOptionFromExpiresAt(
        announcement.created_at,
        announcement.expires_at
      )
    );
    setIsEditModalOpen(true);
  };

  const handleUpdateAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    if (!editTitle.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }

    setUpdating(true);

    const expiresAt = computeExpiresAt(editVisibility);

    const { error } = await supabase
      .from("announcements")
      .update({
        title: editTitle.trim(),
        content: editContent.trim() || null,
        is_pinned: editPinned,
        expires_at: expiresAt,
      })
      .eq("id", editingId);

    setUpdating(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditModalOpen(false);
    setSelectedAnnouncement(null);
    loadAnnouncements();
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    const confirmed = window.confirm(
      "Supprimer cette annonce ? Cette action est irréversible."
    );

    if (!confirmed) return;

    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", announcementId);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedAnnouncement?.id === announcementId) {
      setSelectedAnnouncement(null);
    }

    loadAnnouncements();
  };

  return (
    <AppLayout title="Annonces">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Informations du groupe
              </p>
              <h1 className="mt-3 text-3xl font-bold text-violet-400">
                Annonces
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Retrouvez ici les dernières informations importantes du groupe de
                lecture. Les annonces épinglées restent visibles en priorité.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400"
              >
                Créer une annonce
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">
                Nombre total d’annonces visibles
              </p>
              <p className="mt-2 text-3xl font-bold text-white">
                {totalAnnouncements}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Annonces épinglées</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {pinnedAnnouncements}
              </p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Chargement des annonces...
          </div>
        ) : announcements.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Aucune annonce visible pour le moment.
          </div>
        ) : (
          <div className="grid gap-4">
            {announcements.map((announcement) => (
              <button
                key={announcement.id}
                onClick={() => setSelectedAnnouncement(announcement)}
                className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-violet-500/40 hover:bg-slate-800"
              >
                <div className="flex flex-wrap items-center gap-3">
                  {announcement.is_pinned && (
                    <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
                      Épinglée
                    </span>
                  )}
                  <p className="text-sm text-slate-500">
                    {formatDate(announcement.created_at)}
                  </p>
                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {announcement.expires_at
                      ? `Visible jusqu’au ${formatDate(announcement.expires_at)}`
                      : "Visible sans limite"}
                  </span>
                </div>

                <h2 className="mt-3 text-2xl font-semibold text-white">
                  {announcement.title}
                </h2>

                <p className="mt-3 line-clamp-3 text-slate-300">
                  {announcement.content || "Aucun contenu pour cette annonce."}
                </p>

                <p className="mt-4 text-sm text-slate-500">
                  Auteur : {profilesMap[announcement.created_by] || "Utilisateur"}
                </p>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedAnnouncement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  {selectedAnnouncement.is_pinned && (
                    <span className="rounded-full bg-amber-400/20 px-3 py-1 text-xs font-semibold text-amber-300">
                      Épinglée
                    </span>
                  )}
                  <p className="text-sm text-slate-500">
                    {formatDate(selectedAnnouncement.created_at)}
                  </p>
                </div>

                <h2 className="mt-3 text-3xl font-bold text-white">
                  {selectedAnnouncement.title}
                </h2>

                <p className="mt-3 text-sm text-slate-400">
                  Auteur :{" "}
                  {profilesMap[selectedAnnouncement.created_by] || "Utilisateur"}
                </p>

                <p className="mt-2 text-sm text-slate-400">
                  {selectedAnnouncement.expires_at
                    ? `Visible jusqu’au ${formatDateTime(
                        selectedAnnouncement.expires_at
                      )}`
                    : "Annonce visible sans limite"}
                </p>
              </div>

              <button
                onClick={() => setSelectedAnnouncement(null)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <div className="mt-6 whitespace-pre-line text-slate-300">
              {selectedAnnouncement.content || "Aucun contenu pour cette annonce."}
            </div>

            {isAdmin && (
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => openEditModal(selectedAnnouncement)}
                  className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                >
                  Modifier
                </button>

                <button
                  onClick={() => handleDeleteAnnouncement(selectedAnnouncement.id)}
                  className="rounded-xl bg-rose-600 px-4 py-3 font-semibold text-white transition hover:bg-rose-500"
                >
                  Supprimer
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Nouvelle annonce
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Créer une annonce
                </h2>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreateAnnouncement} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Contenu
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Durée de visibilité
                </label>
                <select
                  value={visibility}
                  onChange={(e) =>
                    setVisibility(e.target.value as VisibilityOption)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                >
                  <option value="2weeks">2 semaines</option>
                  <option value="1month">1 mois</option>
                  <option value="1year">1 an</option>
                  <option value="forever">Forever</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  checked={isPinned}
                  onChange={(e) => setIsPinned(e.target.checked)}
                  className="h-4 w-4"
                />
                Épingler cette annonce
              </label>

              <p className="text-sm text-slate-400">
                Durée choisie : {getExpiryLabel(visibility)}
              </p>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Création en cours..." : "Publier l’annonce"}
              </button>
            </form>
          </div>
        </div>
      )}

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Modifier
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Modifier l’annonce
                </h2>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleUpdateAnnouncement} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Contenu
                </label>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Durée de visibilité
                </label>
                <select
                  value={editVisibility}
                  onChange={(e) =>
                    setEditVisibility(e.target.value as VisibilityOption)
                  }
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-violet-400"
                >
                  <option value="2weeks">2 semaines</option>
                  <option value="1month">1 mois</option>
                  <option value="1year">1 an</option>
                  <option value="forever">Forever</option>
                </select>
              </div>

              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  checked={editPinned}
                  onChange={(e) => setEditPinned(e.target.checked)}
                  className="h-4 w-4"
                />
                Épingler cette annonce
              </label>

              <p className="text-sm text-slate-400">
                Durée choisie : {getExpiryLabel(editVisibility)}
              </p>

              <button
                type="submit"
                disabled={updating}
                className="w-full rounded-xl bg-violet-500 px-4 py-3 font-semibold text-white transition hover:bg-violet-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating
                  ? "Modification en cours..."
                  : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}