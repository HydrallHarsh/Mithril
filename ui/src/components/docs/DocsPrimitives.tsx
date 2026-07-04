"use client";

import { useState } from "react";

export function CodeBlock({
  code,
  language = "bash",
  filename,
}: {
  code: string;
  language?: string;
  filename?: string;
}) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-surface-border bg-[#0a0c12]">
      {filename && (
        <div className="flex items-center gap-2 border-b border-surface-border bg-surface-card/60 px-4 py-2">
          <div className="flex gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
            <span className="h-2.5 w-2.5 rounded-full bg-zinc-700" />
          </div>
          <span className="ml-2 font-mono text-[0.7rem] text-zinc-500">
            {filename}
          </span>
        </div>
      )}
      <pre className="overflow-x-auto p-4 text-[0.82rem] leading-relaxed">
        <code className={`language-${language} text-zinc-300`}>{code}</code>
      </pre>
      <button
        onClick={copy}
        className="absolute right-3 top-3 rounded-md border border-surface-border bg-surface-card/80 px-2.5 py-1 text-[0.65rem] font-medium uppercase tracking-wider text-zinc-500 opacity-0 backdrop-blur transition-all hover:border-zinc-600 hover:text-zinc-300 group-hover:opacity-100"
      >
        {copied ? "Copied!" : "Copy"}
      </button>
    </div>
  );
}

export function Endpoint({
  method,
  path,
  description,
}: {
  method: string;
  path: string;
  description: string;
}) {
  const methodColors: Record<string, string> = {
    GET: "bg-brand-500/15 text-brand-400 border-brand-500/20",
    POST: "bg-accent-500/15 text-accent-400 border-accent-500/20",
    PUT: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    DELETE: "bg-red-500/15 text-red-400 border-red-500/20",
  };

  return (
    <div className="flex flex-wrap items-start gap-3 rounded-lg border border-surface-border bg-surface-card/40 px-4 py-3">
      <span
        className={`shrink-0 rounded-md border px-2 py-0.5 font-mono text-[0.7rem] font-bold ${methodColors[method] || "bg-zinc-800 text-zinc-400 border-zinc-700"}`}
      >
        {method}
      </span>
      <code className="shrink-0 font-mono text-sm text-zinc-200">{path}</code>
      <span className="basis-full text-sm text-zinc-500 sm:basis-auto sm:ml-auto">
        {description}
      </span>
    </div>
  );
}

export function InfoCard({
  icon,
  title,
  children,
}: {
  icon: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-surface-card/50 p-5 transition-colors hover:border-zinc-700/60">
      <div className="mb-3 flex items-center gap-2.5">
        <span className="text-lg">{icon}</span>
        <h3 className="font-display text-sm font-semibold tracking-display text-zinc-200">
          {title}
        </h3>
      </div>
      <div className="text-sm leading-relaxed text-zinc-400">{children}</div>
    </div>
  );
}

export function StepCard({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex gap-5 pb-8 last:pb-0">
      {/* Connector line */}
      <div className="absolute left-[17px] top-10 bottom-0 w-px bg-gradient-to-b from-surface-border to-transparent last:hidden" />

      <div className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-surface-border bg-surface-card font-display text-sm font-bold text-brand-400">
        {step}
      </div>
      <div className="pt-1">
        <h4 className="mb-2 font-display text-sm font-semibold tracking-display text-zinc-200">
          {title}
        </h4>
        <div className="text-sm leading-relaxed text-zinc-400">{children}</div>
      </div>
    </div>
  );
}

export function ParamTable({
  params,
}: {
  params: { name: string; type: string; required: boolean; description: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-surface-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-surface-border bg-surface-card/60">
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
              Parameter
            </th>
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
              Type
            </th>
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500 hidden sm:table-cell">
              Required
            </th>
            <th className="px-4 py-2.5 text-left text-[0.7rem] font-semibold uppercase tracking-label text-zinc-500">
              Description
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {params.map((p) => (
            <tr key={p.name} className="group">
              <td className="px-4 py-2.5">
                <code className="text-brand-400">{p.name}</code>
              </td>
              <td className="px-4 py-2.5 font-mono text-xs text-zinc-500">
                {p.type}
              </td>
              <td className="px-4 py-2.5 hidden sm:table-cell">
                {p.required ? (
                  <span className="text-amber-400 text-xs">required</span>
                ) : (
                  <span className="text-zinc-600 text-xs">optional</span>
                )}
              </td>
              <td className="px-4 py-2.5 text-zinc-400">{p.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
