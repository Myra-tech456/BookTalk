import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function UpdatePasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage("");
    setErrorMessage("");

    if (password.length < 6) {
      setErrorMessage("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Mot de passe mis à jour avec succès.");
    setTimeout(() => navigate("/login"), 1500);
  };

  return (
    <div className="min-h-screen bg-ocean-950 px-4 py-10 text-sand-50">
      <div className="mx-auto max-w-md rounded-3xl border border-ocean-800 bg-ocean-900 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-ocean-300">
          Sécurité
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gold-300">
          Nouveau mot de passe
        </h1>

        {!ready ? (
          <p className="mt-4 text-sand-200">
            Ouvre cette page depuis le lien reçu par email.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-sand-200">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-ocean-700 bg-ocean-950 px-4 py-3 text-sand-50 outline-none focus:border-gold-300"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-sand-200">
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl border border-ocean-700 bg-ocean-950 px-4 py-3 text-sand-50 outline-none focus:border-gold-300"
              />
            </div>

            {message && (
              <div className="rounded-xl bg-ocean-800 px-4 py-3 text-sm text-sand-100">
                {message}
              </div>
            )}

            {errorMessage && (
              <div className="rounded-xl bg-sand-700/40 px-4 py-3 text-sm text-sand-50">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-gold-400 px-4 py-3 font-semibold text-ocean-950 transition hover:bg-gold-300 disabled:opacity-60"
            >
              {loading ? "Mise à jour..." : "Changer le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}