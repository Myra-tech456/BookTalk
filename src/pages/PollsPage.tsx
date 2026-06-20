import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Poll = {
  id: string;
  title: string;
  description: string | null;
  options: string[];
  allow_multiple: boolean;
  deadline: string;
  created_by: string;
  created_at: string;
};

type PollVote = {
  id: string;
  poll_id: string;
  user_id: string;
  selected_options: string[];
  created_at: string;
};

type Profile = {
  id: string;
  username: string | null;
  full_name: string | null;
};

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

function getTimeLeft(deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return "Expiré";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);

  if (days > 0) return `${days}j ${hours}h ${minutes}min`;
  if (hours > 0) return `${hours}h ${minutes}min`;
  return `${minutes}min`;
}

function getPollStatus(deadline: string) {
  const now = new Date().getTime();
  const end = new Date(deadline).getTime();
  const diff = end - now;

  if (diff <= 0) return "expiré";
  if (diff <= 1000 * 60 * 60 * 24 * 2) return "bientôt terminé";
  return "ouvert";
}

export default function PollsPage() {
  const { user, role } = useAuth();
  const isAdmin = role === "admin" || role === "superadmin";

  const [polls, setPolls] = useState<Poll[]>([]);
  const [votes, setVotes] = useState<PollVote[]>([]);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [optionsText, setOptionsText] = useState("");
  const [allowMultiple, setAllowMultiple] = useState(false);
  const [deadline, setDeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editOptionsText, setEditOptionsText] = useState("");
  const [editAllowMultiple, setEditAllowMultiple] = useState(false);
  const [editDeadline, setEditDeadline] = useState("");
  const [updating, setUpdating] = useState(false);

  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [voteSubmitting, setVoteSubmitting] = useState(false);

  const loadPollsAndVotes = async () => {
    setLoading(true);

    const { data: pollsData, error: pollsError } = await supabase
      .from("polls")
      .select("*")
      .order("created_at", { ascending: false });

    if (pollsError) {
      console.error("Erreur chargement sondages :", pollsError.message);
      setLoading(false);
      return;
    }

    const { data: votesData, error: votesError } = await supabase
      .from("poll_votes")
      .select("*");

    if (votesError) {
      console.error("Erreur chargement votes :", votesError.message);
      setLoading(false);
      return;
    }

    const allPolls = (pollsData || []) as Poll[];
    const allVotes = (votesData || []) as PollVote[];

    setPolls(allPolls);
    setVotes(allVotes);

    const authorIds = [...new Set(allPolls.map((poll) => poll.created_by))];

    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name")
        .in("id", authorIds);

      if (!profilesError && profilesData) {
        const map: Record<string, string> = {};
        (profilesData as Profile[]).forEach((profile) => {
          map[profile.id] =
            profile.username || profile.full_name || "Utilisateur";
        });
        setProfilesMap(map);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    loadPollsAndVotes();
  }, []);

  const activePolls = useMemo(() => {
    return polls.filter((poll) => new Date(poll.deadline).getTime() > Date.now());
  }, [polls]);

  const archivedPolls = useMemo(() => {
    return polls.filter((poll) => new Date(poll.deadline).getTime() <= Date.now());
  }, [polls]);

  const totalPolls = polls.length;
  const openPollsCount = activePolls.length;
  const archivedPollsCount = archivedPolls.length;

  const resetCreateForm = () => {
    setTitle("");
    setDescription("");
    setOptionsText("");
    setAllowMultiple(false);
    setDeadline("");
  };

  const parseOptions = (raw: string) => {
    return raw
      .split("\n")
      .map((option) => option.trim())
      .filter(Boolean);
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    const parsedOptions = parseOptions(optionsText);

    if (!title.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }

    if (parsedOptions.length < 2) {
      alert("Il faut au moins 2 choix de réponse.");
      return;
    }

    if (!deadline) {
      alert("La date limite est obligatoire.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("polls").insert({
      title: title.trim(),
      description: description.trim() || null,
      options: parsedOptions,
      allow_multiple: allowMultiple,
      deadline: new Date(deadline).toISOString(),
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetCreateForm();
    setIsCreateModalOpen(false);
    loadPollsAndVotes();
  };

  const openEditModal = (poll: Poll) => {
    const localDeadline = new Date(poll.deadline);
    const offset = localDeadline.getTimezoneOffset();
    const localDate = new Date(localDeadline.getTime() - offset * 60000)
      .toISOString()
      .slice(0, 16);

    setEditingId(poll.id);
    setEditTitle(poll.title);
    setEditDescription(poll.description || "");
    setEditOptionsText(poll.options.join("\n"));
    setEditAllowMultiple(poll.allow_multiple);
    setEditDeadline(localDate);
    setIsEditModalOpen(true);
  };

  const handleUpdatePoll = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    const parsedOptions = parseOptions(editOptionsText);

    if (!editTitle.trim()) {
      alert("Le titre est obligatoire.");
      return;
    }

    if (parsedOptions.length < 2) {
      alert("Il faut au moins 2 choix de réponse.");
      return;
    }

    if (!editDeadline) {
      alert("La date limite est obligatoire.");
      return;
    }

    setUpdating(true);

    const { error } = await supabase
      .from("polls")
      .update({
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        options: parsedOptions,
        allow_multiple: editAllowMultiple,
        deadline: new Date(editDeadline).toISOString(),
      })
      .eq("id", editingId);

    setUpdating(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditModalOpen(false);
    setSelectedPoll(null);
    loadPollsAndVotes();
  };

  const handleDeletePoll = async (pollId: string) => {
    const confirmed = window.confirm(
      "Supprimer ce sondage ? Cette action est irréversible."
    );

    if (!confirmed) return;

    const { error } = await supabase.from("polls").delete().eq("id", pollId);

    if (error) {
      alert(error.message);
      return;
    }

    if (selectedPoll?.id === pollId) {
      setSelectedPoll(null);
    }

    loadPollsAndVotes();
  };

  const getVotesForPoll = (pollId: string) => {
    return votes.filter((vote) => vote.poll_id === pollId);
  };

  const getCurrentUserVote = (pollId: string) => {
    if (!user) return null;
    return votes.find((vote) => vote.poll_id === pollId && vote.user_id === user.id) || null;
  };

  const getOptionVoteCount = (pollId: string, option: string) => {
    return votes.filter(
      (vote) =>
        vote.poll_id === pollId &&
        Array.isArray(vote.selected_options) &&
        vote.selected_options.includes(option)
    ).length;
  };

  const openPollDetails = (poll: Poll) => {
    setSelectedPoll(poll);
    const existingVote = getCurrentUserVote(poll.id);
    setSelectedOptions(existingVote?.selected_options || []);
  };

  const toggleOption = (poll: Poll, option: string) => {
    if (poll.allow_multiple) {
      setSelectedOptions((prev) =>
        prev.includes(option)
          ? prev.filter((item) => item !== option)
          : [...prev, option]
      );
    } else {
      setSelectedOptions([option]);
    }
  };

  const handleSubmitVote = async () => {
    if (!user || !selectedPoll) return;

    const status = getPollStatus(selectedPoll.deadline);
    if (status === "expiré") {
      alert("Ce sondage est expiré.");
      return;
    }

    if (selectedOptions.length === 0) {
      alert("Sélectionne au moins une réponse.");
      return;
    }

    if (!selectedPoll.allow_multiple && selectedOptions.length > 1) {
      alert("Ce sondage n’autorise qu’une seule réponse.");
      return;
    }

    setVoteSubmitting(true);

    const existingVote = getCurrentUserVote(selectedPoll.id);

    let error = null;

    if (existingVote) {
      const result = await supabase
        .from("poll_votes")
        .update({
          selected_options: selectedOptions,
        })
        .eq("id", existingVote.id);

      error = result.error;
    } else {
      const result = await supabase.from("poll_votes").insert({
        poll_id: selectedPoll.id,
        user_id: user.id,
        selected_options: selectedOptions,
      });

      error = result.error;
    }

    setVoteSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    await loadPollsAndVotes();
    const refreshed = polls.find((poll) => poll.id === selectedPoll.id) || selectedPoll;
    setSelectedPoll(refreshed);
  };

  const PollCard = ({ poll }: { poll: Poll }) => {
    const status = getPollStatus(poll.deadline);
    const totalVotesForPoll = getVotesForPoll(poll.id).length;

    return (
      <button
        onClick={() => openPollDetails(poll)}
        className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-left transition hover:border-fuchsia-500/40 hover:bg-slate-800"
      >
        <div className="flex flex-wrap items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              status === "ouvert"
                ? "bg-emerald-400/20 text-emerald-300"
                : status === "bientôt terminé"
                ? "bg-amber-400/20 text-amber-300"
                : "bg-rose-500/20 text-rose-300"
            }`}
          >
            {status}
          </span>

          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {poll.allow_multiple ? "Réponses multiples" : "Réponse unique"}
          </span>
        </div>

        <h2 className="mt-4 text-2xl font-semibold text-white">{poll.title}</h2>

        <p className="mt-3 line-clamp-3 text-slate-300">
          {poll.description || "Aucune description."}
        </p>

        <div className="mt-4 space-y-1 text-sm text-slate-500">
          <p>Date limite : {formatDateTime(poll.deadline)}</p>
          <p>Temps restant : {getTimeLeft(poll.deadline)}</p>
          <p>Nombre de votes : {totalVotesForPoll}</p>
          <p>Auteur : {profilesMap[poll.created_by] || "Utilisateur"}</p>
        </div>
      </button>
    );
  };

  return (
    <AppLayout title="Sondages">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Participation du groupe
              </p>
              <h1 className="mt-3 text-3xl font-bold text-fuchsia-400">
                Sondages
              </h1>
              <p className="mt-3 max-w-2xl text-slate-300">
                Répondez aux sondages du groupe, consultez les résultats et suivez
                les échéances avant la fermeture automatique.
              </p>
            </div>

            {isAdmin && (
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="rounded-xl bg-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:bg-fuchsia-400"
              >
                Créer un sondage
              </button>
            )}
          </div>
        </div>

        {isAdmin && (
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Nombre total</p>
              <p className="mt-2 text-3xl font-bold text-white">{totalPolls}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Sondages ouverts</p>
              <p className="mt-2 text-3xl font-bold text-white">{openPollsCount}</p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
              <p className="text-sm text-slate-400">Sondages archivés</p>
              <p className="mt-2 text-3xl font-bold text-white">
                {archivedPollsCount}
              </p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Sondages ouverts</h2>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
              Chargement des sondages...
            </div>
          ) : activePolls.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
              Aucun sondage ouvert.
            </div>
          ) : (
            <div className="grid gap-4">
              {activePolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <h2 className="text-xl font-semibold text-white">Archives</h2>
          </div>

          {loading ? null : archivedPolls.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
              Aucun sondage archivé.
            </div>
          ) : (
            <div className="grid gap-4">
              {archivedPolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))}
            </div>
          )}
        </div>
      </section>

      {selectedPoll && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      getPollStatus(selectedPoll.deadline) === "ouvert"
                        ? "bg-emerald-400/20 text-emerald-300"
                        : getPollStatus(selectedPoll.deadline) === "bientôt terminé"
                        ? "bg-amber-400/20 text-amber-300"
                        : "bg-rose-500/20 text-rose-300"
                    }`}
                  >
                    {getPollStatus(selectedPoll.deadline)}
                  </span>

                  <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
                    {selectedPoll.allow_multiple
                      ? "Réponses multiples"
                      : "Réponse unique"}
                  </span>
                </div>

                <h2 className="mt-3 text-3xl font-bold text-white">
                  {selectedPoll.title}
                </h2>

                <p className="mt-3 text-slate-300">
                  {selectedPoll.description || "Aucune description."}
                </p>

                <div className="mt-4 space-y-1 text-sm text-slate-500">
                  <p>Date limite : {formatDateTime(selectedPoll.deadline)}</p>
                  <p>Temps restant : {getTimeLeft(selectedPoll.deadline)}</p>
                  <p>
                    Auteur : {profilesMap[selectedPoll.created_by] || "Utilisateur"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedPoll(null)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold text-white">Répondre</h3>
                <div className="mt-4 space-y-3">
                  {selectedPoll.options.map((option) => (
                    <label
                      key={option}
                      className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 hover:border-fuchsia-500/40"
                    >
                      <input
                        type={selectedPoll.allow_multiple ? "checkbox" : "radio"}
                        name={`poll-${selectedPoll.id}`}
                        checked={selectedOptions.includes(option)}
                        onChange={() => toggleOption(selectedPoll, option)}
                        disabled={getPollStatus(selectedPoll.deadline) === "expiré"}
                        className="mt-1"
                      />
                      <span className="text-slate-200">{option}</span>
                    </label>
                  ))}
                </div>

                <button
                  onClick={handleSubmitVote}
                  disabled={
                    voteSubmitting || getPollStatus(selectedPoll.deadline) === "expiré"
                  }
                  className="mt-5 w-full rounded-xl bg-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {voteSubmitting ? "Envoi en cours..." : "Enregistrer ma réponse"}
                </button>

                {getCurrentUserVote(selectedPoll.id) && (
                  <p className="mt-3 text-sm text-slate-400">
                    Tu as déjà répondu à ce sondage. Tu peux modifier ta réponse
                    tant qu’il est ouvert.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950 p-5">
                <h3 className="text-xl font-semibold text-white">Résultats</h3>
                <div className="mt-4 space-y-4">
                  {selectedPoll.options.map((option) => {
                    const count = getOptionVoteCount(selectedPoll.id, option);
                    const totalVotesForPoll = getVotesForPoll(selectedPoll.id).length;
                    const percentage =
                      totalVotesForPoll === 0
                        ? 0
                        : Math.round((count / totalVotesForPoll) * 100);

                    return (
                      <div key={option}>
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <span className="text-slate-200">{option}</span>
                          <span className="text-sm text-slate-400">
                            {count} vote(s) • {percentage}%
                          </span>
                        </div>
                        <div className="h-3 overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-fuchsia-500 transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  onClick={() => openEditModal(selectedPoll)}
                  className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                >
                  Modifier
                </button>

                <button
                  onClick={() => handleDeletePoll(selectedPoll.id)}
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
                  Nouveau sondage
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Créer un sondage
                </h2>
              </div>

              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description courte
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Choix de réponses *
                </label>
                <textarea
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  rows={6}
                  placeholder={"Un choix par ligne\nChoix 1\nChoix 2\nChoix 3"}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Date limite *
                </label>
                <input
                  type="datetime-local"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  checked={allowMultiple}
                  onChange={(e) => setAllowMultiple(e.target.checked)}
                  className="h-4 w-4"
                />
                Autoriser plusieurs réponses
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Création en cours..." : "Publier le sondage"}
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
                  Modifier le sondage
                </h2>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleUpdatePoll} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Description courte
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Choix de réponses *
                </label>
                <textarea
                  value={editOptionsText}
                  onChange={(e) => setEditOptionsText(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Date limite *
                </label>
                <input
                  type="datetime-local"
                  value={editDeadline}
                  onChange={(e) => setEditDeadline(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-fuchsia-400"
                />
              </div>

              <label className="flex items-center gap-3 text-slate-300">
                <input
                  type="checkbox"
                  checked={editAllowMultiple}
                  onChange={(e) => setEditAllowMultiple(e.target.checked)}
                  className="h-4 w-4"
                />
                Autoriser plusieurs réponses
              </label>

              <button
                type="submit"
                disabled={updating}
                className="w-full rounded-xl bg-fuchsia-500 px-4 py-3 font-semibold text-white transition hover:bg-fuchsia-400 disabled:cursor-not-allowed disabled:opacity-60"
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