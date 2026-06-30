const STEPS = [
  {
    num: "01",
    title: "Ingest.",
    body: "Every memory claim enters through Mithril — with source, author, and timestamp attached. Nothing writes directly to Cognee.",
    tags: ["MemoryClaim", "provenance"],
  },
  {
    num: "02",
    title: "Investigate.",
    body: "Mithril recalls verified context via cognee.recall(only_context=True), scores contradictions with the LLM, and weights source reputation into a normalized trust score.",
    tags: ["cognee.recall", "contradiction", "scorer"],
  },
  {
    num: "03",
    title: "Gate.",
    body: "Accept and warn tiers land in Cognee with NodeSet tags. Quarantine, review, and reject stay out of the graph — but every decision hits the audit log.",
    tags: ["node_set", "audit", "quarantine"],
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="border-t border-zinc-800 py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-16 max-w-2xl">
          <p className="mb-3 text-sm text-zinc-500">How Mithril works</p>
          <h2 className="font-display text-4xl font-bold tracking-tight text-zinc-50 sm:text-5xl">
            From signal to a verified memory.
          </h2>
          <p className="mt-4 text-lg text-zinc-400">
            Three steps. No prompt engineering. Cognee APIs you can name in the
            README.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {STEPS.map((step) => (
            <article
              key={step.num}
              className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-6 transition hover:border-zinc-700"
            >
              <p className="mb-4 font-mono text-sm text-emerald-400">{step.num}</p>
              <h3 className="font-display mb-3 text-xl font-semibold text-zinc-100">
                {step.title}
              </h3>
              <p className="mb-4 text-sm leading-relaxed text-zinc-400">
                {step.body}
              </p>
              <div className="flex flex-wrap gap-2">
                {step.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-zinc-800 bg-zinc-900 px-2 py-0.5 font-mono text-[11px] text-zinc-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
