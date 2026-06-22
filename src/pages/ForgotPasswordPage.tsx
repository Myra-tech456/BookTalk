import { useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setErrorMessage("");

    const redirectTo =
      window.location.hostname === "localhost"
        ? "http://localhost:5173/update-password"
        : "https://booktalk-club.netlify.app/update-password";

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    setLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Un email de réinitialisation a été envoyé si ce compte existe.");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-ocean-950 px-4 py-10 text-sand-50">
      <div className="mx-auto max-w-md rounded-3xl border border-ocean-800 bg-ocean-900 p-6">
        <p className="text-sm uppercase tracking-[0.2em] text-ocean-300">
          Authentification
        </p>
        <h1 className="mt-3 text-3xl font-bold text-gold-300">
          Mot de passe oublié
        </h1>
        <p className="mt-3 text-sand-200">
          Entre ton adresse email pour recevoir un lien de réinitialisation.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-sand-200">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Envoi..." : "Envoyer le lien"}
          </button>
        </form>

        <Link
          to="/login"
          className="mt-4 inline-block text-sm text-ocean-300 hover:text-sand-50"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}