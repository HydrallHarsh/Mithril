const APIS = [
  {
    name: "cognee.remember()",
    desc: "Verified claims only — tagged with node_set=[\"verified\", source]",
  },
  {
    name: "cognee.recall()",
    desc: "Contradiction detection (only_context) + scoped answers (node_name filter)",
  },
  {
    name: "cognee.improve()",
    desc: "Graph enrichment on the verified_memories dataset",
  },
  {
    name: "cognee.forget()",
    desc: "Clean demo reset between attack runs",
  },
];

export function CogneeStack() {
  return (
    <section className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
              Built on Cognee,
              <br />
              not bolted on.
            </h2>
            <p className="mt-4 text-lg text-zinc-400">
              Mithril is a governance wrapper — it uses NodeSets, dataset scoping,
              and recall modes the way the Cognee judges expect to see them.
            </p>
          </div>

          <div className="space-y-3">
            {APIS.map((api) => (
              <div
                key={api.name}
                className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 transition hover:border-emerald-500/30"
              >
                <p className="font-mono text-sm text-emerald-400">{api.name}</p>
                <p className="mt-1 text-sm text-zinc-500">{api.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
