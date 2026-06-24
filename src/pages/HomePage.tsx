import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-slate-800 bg-slate-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
              Groupe de lecture
            </p>
            <h1 className="text-2xl font-bold text-violet-400">BookTalk</h1>
          </div>

          <a
            href="HTTPS://CHAT.WHATSAPP.COM/CXCTBOHIE8VESZPEVK74T0"
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-violet-400 px-5 py-2 text-sm font-medium text-violet-300 transition hover:bg-violet-500 hover:text-white"
          >
            Lien vers le groupe WhatsApp
          </a>
        </div>
      </header>

      <section className="mx-auto flex min-h-[calc(100vh-81px)] max-w-7xl items-center justify-center px-6 py-12">
        <div className="w-full max-w-4xl rounded-4xl border border-slate-800 bg-slate-900 px-8 py-10 shadow-2xl shadow-slate-950/30 md:px-14 md:py-14">
          <div className="flex flex-col items-center text-center">
            <img
              src="/booktalk-logo.jpg"
              alt="Logo BookTalk"
              className="w-full max-w-md rounded-3xl object-cover shadow-lg"
            />

            <h2 className="mt-10 text-3xl font-bold text-violet-400 md:text-5xl">
              Bienvenue sur le site du groupe BOOKTALK
            </h2>

            <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300 md:text-lg">
              Retrouvez ici l’espace du groupe pour lire, partager, échanger
              et suivre toutes les activités de BookTalk.
            </p>

            <Link
              to="/login"
              className="mt-10 rounded-full bg-violet-500 px-8 py-4 text-base font-semibold text-white transition hover:bg-violet-400"
            >
              S’inscrire / Se connecter
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}