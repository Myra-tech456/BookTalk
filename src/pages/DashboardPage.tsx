import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

type Announcement = {
  id: string;
  title: string;
  created_at: string;
};

type Poll = {
  id: string;
  title: string;
  created_at: string;
};

type Book = {
  id: string;
  title: string;
  author: string;
  created_at: string;
};

function getRoleLabel(role: string | null) {
  if (role === "superadmin") return "Super admin";
  if (role === "admin") return "Admin";
  return "Membre";
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function DashboardPage() {
  const { user, role } = useAuth();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [latestAnnouncement, setLatestAnnouncement] =
    useState<Announcement | null>(null);
  const [latestPoll, setLatestPoll] = useState<Poll | null>(null);
  const [latestBook, setLatestBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      if (!user) return;

      const profileQuery = supabase
        .from("profiles")
        .select("id, username, full_name")
        .eq("id", user.id)
        .single();

      const announcementQuery = supabase
        .from("announcements")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const pollQuery = supabase
        .from("polls")
        .select("id, title, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const bookQuery = supabase
        .from("books")
        .select("id, title, author, created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const [profileResult, announcementResult, pollResult, bookResult] =
        await Promise.all([
          profileQuery,
          announcementQuery,
          pollQuery,
          bookQuery,
        ]);

      if (!profileResult.error) setProfile(profileResult.data);
      if (!announcementResult.error) setLatestAnnouncement(announcementResult.data);
      if (!pollResult.error) setLatestPoll(pollResult.data);
      if (!bookResult.error) setLatestBook(bookResult.data);

      setLoading(false);
    };

    loadDashboard();
  }, [user]);

  const displayName =
    profile?.username || profile?.full_name || user?.email || "Utilisateur";

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
          Chargement du dashboard...
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <section className="grid gap-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-xl shadow-slate-950/30 lg:p-8">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Bienvenue
          </p>
          <h1 className="mt-3 text-3xl font-bold text-violet-400">
            Bonjour {displayName}
          </h1>
          <p className="mt-3 text-base text-slate-300">
            Statut dans le groupe :{" "}
            <span className="font-semibold text-white">{getRoleLabel(role)}</span>
          </p>
          <p className="mt-2 max-w-2xl text-sm text-slate-400">
            Depuis cette page, tu peux voir les dernières activités du groupe et
            accéder rapidement aux sections principales.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Link
            to="/announcements"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-violet-500/40 hover:bg-slate-800"
          >
            <p className="text-sm font-medium text-slate-400">Dernière annonce</p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {latestAnnouncement?.title || "Aucune annonce pour le moment"}
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {latestAnnouncement?.created_at
                ? `Publiée le ${formatDate(latestAnnouncement.created_at)}`
                : "Les annonces apparaîtront ici."}
            </p>
          </Link>

          <Link
            to="/polls"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-blue-500/40 hover:bg-slate-800"
          >
            <p className="text-sm font-medium text-slate-400">Dernier sondage</p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {latestPoll?.title || "Aucun sondage pour le moment"}
            </h2>
            <p className="mt-3 text-sm text-slate-500">
              {latestPoll?.created_at
                ? `Ajouté le ${formatDate(latestPoll.created_at)}`
                : "Les sondages apparaîtront ici."}
            </p>
          </Link>

          <Link
            to="/library"
            className="rounded-2xl border border-slate-800 bg-slate-900 p-5 transition hover:border-amber-400/40 hover:bg-slate-800 md:col-span-2 xl:col-span-1"
          >
            <p className="text-sm font-medium text-slate-400">
              Dernier livre ajouté
            </p>
            <h2 className="mt-3 text-xl font-semibold text-white">
              {latestBook?.title || "Aucun livre pour le moment"}
            </h2>
            <p className="mt-2 text-sm text-slate-300">
              {latestBook?.author ? `Auteur : ${latestBook.author}` : ""}
            </p>
            <p className="mt-3 text-sm text-slate-500">
              {latestBook?.created_at
                ? `Ajouté le ${formatDate(latestBook.created_at)}`
                : "La bibliothèque apparaîtra ici."}
            </p>
          </Link>
        </div>
      </section>
    </AppLayout>
  );
}