import AppLayout from "../components/AppLayout";

export default function EventsPage() {
  return (
    <AppLayout title="Événements">
      <section className="mx-auto max-w-4xl space-y-6">
        <div className="rounded-[28px] border border-sand-300 bg-sand-600 p-8 shadow-sm">
          <p className="text-sm uppercase tracking-[0.22em] text-ocean-700">
            Espace événements
          </p>

          <h1 className="mt-3 text-3xl font-bold text-ocean-950">
            Événements
          </h1>

          <p className="mt-4 text-lg leading-8 text-ocean-800">
            Cette page sera mise en place lorsqu’il y aura un peu plus
            d’événements, tels que des concours ou des réunions liées au groupe.
          </p>

        </div>
      </section>
    </AppLayout>
  );
}