const ROWS = [
  {
    label: "Poisoned inputs stored",
    vanilla: "All 3 attacks",
    mithril: "0 — blocked at gate",
    bad: true,
  },
  {
    label: "Provenance tracked",
    vanilla: "No",
    mithril: "Full audit trail",
    bad: false,
  },
  {
    label: "Contradiction detected",
    vanilla: "No",
    mithril: "Before storage",
    bad: false,
  },
  {
    label: 'Answer: "How to hash passwords?"',
    vanilla: "May return MD5",
    mithril: "Argon2id from verified memory",
    bad: true,
  },
];

export function ComparisonTable() {
  return (
    <section id="comparison" className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-12 max-w-2xl">
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-50">
            Same graph. Safer writes.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Vanilla Cognee stores what it&apos;s told. Mithril checks first —
            then only verified claims reach the graph.
          </p>
        </div>

        <div className="overflow-hidden rounded-xl border border-zinc-800">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950">
                <th className="px-4 py-3 font-medium text-zinc-500" />
                <th className="px-4 py-3 font-medium text-zinc-400">
                  Vanilla Cognee
                </th>
                <th className="px-4 py-3 font-medium text-emerald-400">
                  Mithril + Cognee
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row) => (
                <tr key={row.label} className="border-b border-zinc-800/80 last:border-0">
                  <td className="px-4 py-4 text-zinc-300">{row.label}</td>
                  <td className="px-4 py-4 font-mono text-xs text-red-400/90">
                    {row.vanilla}
                  </td>
                  <td className="px-4 py-4 font-mono text-xs text-emerald-400/90">
                    {row.mithril}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
