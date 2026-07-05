"use client";

import { DocsLayout } from "@/components/docs/DocsLayout";
import {
  CodeBlock,
  InfoCard,
  StepCard,
  ParamTable,
} from "@/components/docs/DocsPrimitives";

export default function McpServerPage() {
  return (
    <DocsLayout>
      <div className="space-y-8">
        {/* Header */}
        <header>
          <p className="landing-eyebrow mb-2">Integration Guide</p>
          <h1 className="landing-heading text-3xl sm:text-4xl">MCP Server</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-zinc-400">
            Expose Mithril&apos;s governance pipeline over the{" "}
            <span className="text-zinc-200">Model Context Protocol</span>, so
            any MCP-aware agent (Claude Desktop, Cursor, etc.) reads and writes
            memory <em>through</em> Mithril instead of calling Cognee directly.
          </p>
        </header>

        {/* Why MCP */}
        <section className="grid gap-4 sm:grid-cols-2">
          <InfoCard icon="🛡️" title="Zero-Trust Memory">
            Every <code>remember()</code> call passes the trust gate —
            contradiction detection, source reputation scoring, and secret
            redaction — before anything touches Cognee.
          </InfoCard>
          <InfoCard icon="🔍" title="Verified Recall Only">
            <code>recall()</code> returns answers exclusively from claims that
            cleared Mithril&apos;s admission pipeline. Poisoned or quarantined
            memory is automatically excluded.
          </InfoCard>
          <InfoCard icon="📋" title="Quarantine Inspector">
            Agents can call <code>mithril_quarantine_list</code> to see exactly
            what was blocked and why — full provenance for every rejected write.
          </InfoCard>
          <InfoCard icon="📊" title="Live Source Reputation">
            <code>mithril_source_reputation</code> shows adaptive trust scores.
            Sources caught contradicting verified memory lose trust over time;
            accepted sources gain it slowly.
          </InfoCard>
        </section>

        {/* Getting started */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Getting Started</h2>

          <div className="space-y-2">
            <StepCard step={1} title="Install dependencies">
              <p className="mb-3">
                Make sure you have the project installed with its dependencies:
              </p>
              <CodeBlock
                code={`uv pip install -e ".[dev]"
# or
pip install -e ".[dev]"`}
                filename="terminal"
              />
            </StepCard>

            <StepCard step={2} title="Set environment variables">
              <p className="mb-3">
                Copy <code>.env.example</code> to <code>.env</code> and set your
                LLM API key (needed for contradiction and content-danger
                scoring):
              </p>
              <CodeBlock
                code={`# macOS / Linux / WSL
cp .env.example .env

# Windows PowerShell
Copy-Item .env.example .env

# Edit .env and set LLM_API_KEY, LLM_ENDPOINT, and LLM_MODEL.`}
                filename="terminal"
              />
            </StepCard>

            <StepCard step={3} title="Start the MCP server">
              <p className="mb-3">
                For a manual smoke test, run via Make on Windows or directly
                with Python on any OS:
              </p>
              <CodeBlock
                code={`# Windows, using this repo's Makefile
make mcp

# macOS / Linux / WSL
python -m mcp_server.server`}
                filename="terminal"
              />
            </StepCard>

            <StepCard step={4} title="Register in an MCP host">
              <p className="mb-3">
                MCP hosts launch the server for you, so use absolute paths for
                both <code>command</code> and <code>cwd</code>. Replace the
                sample path with your local repo path.
              </p>
              <CodeBlock
                language="json"
                filename="claude_desktop_config.json"
                code={`{
  "mcpServers": {
    "mithril": {
      "command": "/absolute/path/to/hack-ideas2/.venv/bin/python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "/absolute/path/to/hack-ideas2"
    }
  }
}`}
              />
              <p className="mt-3">
                On Windows, the command path usually looks like{" "}
                <code>{"C:\\Users\\you\\path\\hack-ideas2\\.venv\\Scripts\\python.exe"}</code>.
                In WSL, use the Linux path inside WSL and configure the IDE that
                is running inside WSL.
              </p>
            </StepCard>
          </div>
        </section>

        {/* IDE setup */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">IDE Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <InfoCard icon="🖥️" title="Claude Desktop">
              Add the server under <code>mcpServers</code> in{" "}
              <code>claude_desktop_config.json</code>, then fully restart Claude
              Desktop. Common config locations are{" "}
              <code>{"%APPDATA%\\Claude"}</code> on Windows and{" "}
              <code>~/Library/Application Support/Claude</code> on macOS.
            </InfoCard>
            <InfoCard icon="⌨️" title="Cursor">
              Add the same server object in Cursor&apos;s MCP settings or in a
              workspace <code>.cursor/mcp.json</code> file if your Cursor version
              supports project-level MCP configuration. Keep <code>cwd</code>{" "}
              pointed at the repo root so <code>load_dotenv()</code> finds{" "}
              <code>.env</code>.
            </InfoCard>
          </div>
          <div className="mt-4">
            <CodeBlock
              language="json"
              filename=".cursor/mcp.json"
              code={`{
  "mcpServers": {
    "mithril": {
      "command": "/absolute/path/to/hack-ideas2/.venv/bin/python",
      "args": ["-m", "mcp_server.server"],
      "cwd": "/absolute/path/to/hack-ideas2"
    }
  }
}`}
            />
          </div>
        </section>

        {/* Tools reference */}
        <section>
          <h2 className="landing-heading mb-5 text-xl">Tools Reference</h2>

          {/* mithril_remember */}
          <div className="mb-6 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-accent-500/15 px-2 py-0.5 font-mono text-xs text-accent-400 border border-accent-500/20">
                tool
              </span>
              mithril_remember
            </h3>
            <p className="text-sm text-zinc-400">
              Submit a memory claim through Mithril&apos;s trust gate. The claim
              is scored for source reputation, checked for contradictions against
              verified memory, and only stored in Cognee if it clears the
              admission threshold.
            </p>
            <ParamTable
              params={[
                {
                  name: "text",
                  type: "string",
                  required: true,
                  description:
                    "The claim or fact the agent wants to remember.",
                },
                {
                  name: "source",
                  type: "string",
                  required: false,
                  description:
                    'Where it came from, e.g. "Slack", "Security Policy". Defaults to "AI Agent".',
                },
                {
                  name: "author",
                  type: "string",
                  required: false,
                  description:
                    'Who or what produced it. Defaults to "mcp_agent".',
                },
              ]}
            />
            <CodeBlock
              language="text"
              filename="Example response"
              code={`Decision: WARN (STORED in verified memory)
Trust score: 0.84
Reason: Score 0.84 accepted with warning — low confidence

Breakdown:
  - Source 'Security Policy' live reputation: 0.98
  - No contradictions found in verified memory
  - Weighted sum: 0.39 (source 0.39, corroboration +0.00, freshness +0.00, contradiction -0.00, content_danger -0.00)
  - Normalized trust score: 0.84 (÷ 0.47 max theoretical)`}
            />
          </div>

          {/* mithril_recall */}
          <div className="mb-6 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-accent-500/15 px-2 py-0.5 font-mono text-xs text-accent-400 border border-accent-500/20">
                tool
              </span>
              mithril_recall
            </h3>
            <p className="text-sm text-zinc-400">
              Query only verified memory. Poisoned and quarantined claims are
              excluded, so the agent can&apos;t be misled by unverified data.
            </p>
            <ParamTable
              params={[
                {
                  name: "query",
                  type: "string",
                  required: true,
                  description:
                    "The question to answer from verified memory.",
                },
              ]}
            />
          </div>

          {/* mithril_quarantine_list */}
          <div className="mb-6 space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-accent-500/15 px-2 py-0.5 font-mono text-xs text-accent-400 border border-accent-500/20">
                tool
              </span>
              mithril_quarantine_list
            </h3>
            <p className="text-sm text-zinc-400">
              List memory claims Mithril blocked (quarantined / rejected / under
              review). Inspect exactly what was kept out of memory and why.
            </p>
          </div>

          {/* mithril_source_reputation */}
          <div className="space-y-3">
            <h3 className="flex items-center gap-2 font-display text-base font-semibold text-zinc-200">
              <span className="rounded-md bg-accent-500/15 px-2 py-0.5 font-mono text-xs text-accent-400 border border-accent-500/20">
                tool
              </span>
              mithril_source_reputation
            </h3>
            <p className="text-sm text-zinc-400">
              Show Mithril&apos;s current, adaptive trust score for every known
              source. Sources caught contradicting verified memory lose trust;
              accepted sources gain it slowly.
            </p>
          </div>
        </section>
      </div>
    </DocsLayout>
  );
}
