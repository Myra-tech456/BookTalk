import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function SignupPage() {
  const navigate = useNavigate();

  const [pseudo, setPseudo] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: pseudo,
        },
      },
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    alert("Compte créé avec succès.");
    navigate("/login");
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <form
        onSubmit={handleSignup}
        className="w-full max-w-md bg-slate-900 p-8 rounded-2xl shadow-xl space-y-4"
      >
        <h1 className="text-3xl font-bold text-violet-400">Inscription</h1>

        <input
          type="text"
          placeholder="Pseudo"
          value={pseudo}
          onChange={(e) => setPseudo(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
          required
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
          required
        />

        <input
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3"
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-violet-600 px-4 py-3 font-semibold hover:bg-violet-500"
        >
          {loading ? "Création..." : "Créer un compte"}
        </button>

        <p className="text-sm text-slate-300">
          Déjà un compte ?{" "}
          <Link to="/login" className="text-violet-400 hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </main>
  );
}