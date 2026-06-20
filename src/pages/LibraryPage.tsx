import { useEffect, useMemo, useState } from "react";
import AppLayout from "../components/AppLayout";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";

type Book = {
  id: string;
  title: string;
  author: string;
  cover_url: string | null;
  summary: string | null;
  drive_url: string | null;
  created_at: string;
  created_by: string;
};

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export default function LibraryPage() {
  const { user } = useAuth();

  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [summary, setSummary] = useState("");
  const [driveUrl, setDriveUrl] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editAuthor, setEditAuthor] = useState("");
  const [editCoverUrl, setEditCoverUrl] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editDriveUrl, setEditDriveUrl] = useState("");
  const [updating, setUpdating] = useState(false);

  const loadBooks = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("books")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erreur chargement livres :", error.message);
    } else {
      setBooks(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    loadBooks();
  }, []);

  const filteredBooks = useMemo(() => {
    const term = search.toLowerCase().trim();

    if (!term) return books;

    return books.filter((book) => {
      return (
        book.title.toLowerCase().includes(term) ||
        book.author.toLowerCase().includes(term)
      );
    });
  }, [books, search]);

  const resetForm = () => {
    setTitle("");
    setAuthor("");
    setCoverUrl("");
    setSummary("");
    setDriveUrl("");
  };

  const openEditModal = (book: Book) => {
    setEditingBookId(book.id);
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setEditCoverUrl(book.cover_url || "");
    setEditSummary(book.summary || "");
    setEditDriveUrl(book.drive_url || "");
    setIsEditModalOpen(true);
  };

  const handleAddBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) return;

    if (!title.trim() || !author.trim()) {
      alert("Le titre et l’auteur sont obligatoires.");
      return;
    }

    setSubmitting(true);

    const { error } = await supabase.from("books").insert({
      title: title.trim(),
      author: author.trim(),
      cover_url: coverUrl.trim() || null,
      summary: summary.trim() || null,
      drive_url: driveUrl.trim() || null,
      created_by: user.id,
    });

    setSubmitting(false);

    if (error) {
      alert(error.message);
      return;
    }

    resetForm();
    setIsAddModalOpen(false);
    await loadBooks();
  };

  const handleUpdateBook = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingBookId) return;

    if (!editTitle.trim() || !editAuthor.trim()) {
      alert("Le titre et l’auteur sont obligatoires.");
      return;
    }

    setUpdating(true);

    const { error } = await supabase
      .from("books")
      .update({
        title: editTitle.trim(),
        author: editAuthor.trim(),
        cover_url: editCoverUrl.trim() || null,
        summary: editSummary.trim() || null,
        drive_url: editDriveUrl.trim() || null,
      })
      .eq("id", editingBookId);

    setUpdating(false);

    if (error) {
      alert(error.message);
      return;
    }

    setIsEditModalOpen(false);
    setSelectedBook(null);
    await loadBooks();
  };

  return (
    <AppLayout title="Bibliothèque">
      <section className="space-y-6">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
            Bibliothèque collaborative
          </p>
          <h1 className="mt-3 text-3xl font-bold text-amber-300">
            Livres du groupe
          </h1>
          <p className="mt-3 max-w-2xl text-slate-300">
            Cette page rassemble les livres ajoutés par les membres du groupe.
            Chaque fiche contient les informations essentielles et un lien vers
            la version numérique stockée sur Drive.
          </p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-4 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Rechercher un titre ou un auteur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-amber-400 md:max-w-md"
          />

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
          >
            Ajouter un livre
          </button>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Chargement des livres...
          </div>
        ) : filteredBooks.length === 0 ? (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6 text-slate-300">
            Aucun livre trouvé.
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 text-left transition hover:border-amber-400/40 hover:bg-slate-800"
              >
                <div className="aspect-3/4 w-full bg-slate-800">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={`Couverture de ${book.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-400">
                      Pas de couverture
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <h2 className="line-clamp-2 text-xl font-semibold text-white">
                    {book.title}
                  </h2>
                  <p className="mt-2 text-sm text-slate-400">{book.author}</p>
                  <p className="mt-3 text-xs text-slate-500">
                    Ajouté le {formatDate(book.created_at)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedBook && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="grid gap-6 md:grid-cols-[220px_1fr]">
              <div className="overflow-hidden rounded-2xl bg-slate-800">
                {selectedBook.cover_url ? (
                  <img
                    src={selectedBook.cover_url}
                    alt={`Couverture de ${selectedBook.title}`}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-[3/4] items-center justify-center p-6 text-center text-sm text-slate-400">
                    Pas de couverture
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                      Fiche du livre
                    </p>
                    <h2 className="mt-2 text-3xl font-bold text-white">
                      {selectedBook.title}
                    </h2>
                    <p className="mt-2 text-base text-slate-300">
                      Auteur : {selectedBook.author}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedBook(null)}
                    className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
                  >
                    Fermer
                  </button>
                </div>

                <p className="mt-6 text-sm uppercase tracking-[0.2em] text-slate-500">
                  Résumé
                </p>
                <p className="mt-2 whitespace-pre-line text-slate-300">
                  {selectedBook.summary || "Aucun résumé ajouté pour ce livre."}
                </p>

                <div className="mt-6 flex flex-wrap gap-3">
                  {selectedBook.drive_url ? (
                    <a
                      href={selectedBook.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300"
                    >
                      Ouvrir le fichier Drive
                    </a>
                  ) : (
                    <span className="rounded-xl bg-slate-800 px-4 py-3 text-sm text-slate-400">
                      Aucun lien Drive disponible
                    </span>
                  )}

                  <button
                    onClick={() => openEditModal(selectedBook)}
                    className="rounded-xl border border-slate-700 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
                  >
                    Modifier la fiche
                  </button>
                </div>

                <p className="mt-6 text-sm text-slate-500">
                  Ajouté le {formatDate(selectedBook.created_at)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Nouveau livre
                </p>
                <h2 className="mt-2 text-2xl font-bold text-white">
                  Ajouter un livre
                </h2>
              </div>

              <button
                onClick={() => setIsAddModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleAddBook} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Auteur *
                </label>
                <input
                  type="text"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  URL de couverture
                </label>
                <input
                  type="url"
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Résumé
                </label>
                <textarea
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Lien Google Drive
                </label>
                <input
                  type="url"
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {submitting ? "Ajout en cours..." : "Enregistrer le livre"}
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
                  Modifier la fiche du livre
                </h2>
              </div>

              <button
                onClick={() => setIsEditModalOpen(false)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:bg-slate-800"
              >
                Fermer
              </button>
            </div>

            <form onSubmit={handleUpdateBook} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Titre *
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Auteur *
                </label>
                <input
                  type="text"
                  value={editAuthor}
                  onChange={(e) => setEditAuthor(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  URL de couverture
                </label>
                <input
                  type="url"
                  value={editCoverUrl}
                  onChange={(e) => setEditCoverUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Résumé
                </label>
                <textarea
                  value={editSummary}
                  onChange={(e) => setEditSummary(e.target.value)}
                  rows={5}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-300">
                  Lien Google Drive
                </label>
                <input
                  type="url"
                  value={editDriveUrl}
                  onChange={(e) => setEditDriveUrl(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={updating}
                className="w-full rounded-xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {updating ? "Modification en cours..." : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}