"""
Mithril — MCP Server
====================
Exposes Mithril's governance pipeline over the Model Context Protocol, so any
MCP-aware agent (Claude Desktop, Cursor, etc.) writes and reads memory
*through* Mithril instead of calling Cognee directly.

This is what makes the pitch literal: Mithril sits **between the agent and
Cognee**. The agent never gets a raw `remember()` — every write passes the
trust gate first, and recall only ever returns verified memory.

Run:
    make mcp          # or: python -m mcp_server.server

Register in Claude Desktop (claude_desktop_config.json):
    {
      "mcpServers": {
        "mithril": {
          "command": "python",
          "args": ["-m", "mcp_server.server"],
          "cwd": "/absolute/path/to/hack-ideas2"
        }
      }
    }
"""

from __future__ import annotations

import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

from mcp.server.fastmcp import FastMCP

from mithril.firewall import Mithril

mcp = FastMCP("mithril")

_firewall = Mithril()
_ready = False


async def _ensure_ready() -> None:
    """Lazily initialise the firewall stores on first tool call."""
    global _ready
    if not _ready:
        await _firewall.setup()
        _ready = True


@mcp.tool()
async def mithril_remember(
    text: str,
    source: str = "AI Agent",
    author: str = "mcp_agent",
) -> str:
    """
    Submit a memory claim through Mithril's trust gate before it can be stored.

    Use this INSTEAD of writing directly to memory. Mithril scores the claim's
    source reputation, checks it against verified memory for contradictions,
    and only stores it in Cognee if it clears the admission threshold.

    Args:
        text: The claim/fact the agent wants to remember.
        source: Where it came from (e.g. "Slack", "Security Policy", "AI Agent").
        author: Who/what produced it.

    Returns:
        A human-readable decision: status, trust score, and the reasoning.
    """
    await _ensure_ready()
    result = await _firewall.remember(text=text, source=source, author=author)

    stored = "STORED in verified memory" if result.cognee_dataset else "BLOCKED — not stored"
    lines = [
        f"Decision: {result.status.value.upper()} ({stored})",
        f"Trust score: {result.trust_breakdown.final_score:.2f}",
        f"Reason: {result.decision_reason}",
        "",
        "Breakdown:",
    ]
    lines += [f"  - {r}" for r in result.trust_breakdown.reasons]
    return "\n".join(lines)


@mcp.tool()
async def mithril_recall(query: str) -> str:
    """
    Query ONLY verified memory (poisoned/quarantined claims are excluded).

    Use this instead of a raw memory search — answers are drawn exclusively
    from claims that passed Mithril's trust gate, so the agent can't be misled
    by memory that was never verified.

    Args:
        query: The question to answer from verified memory.

    Returns:
        The verified answer plus how many candidates / blocked items were seen.
    """
    await _ensure_ready()
    result = await _firewall.recall_with_metadata(query)
    return (
        f"{result.answer}\n\n"
        f"({result.candidate_count} verified candidate(s); "
        f"{result.blocked_count} blocked claim(s) excluded from this answer.)"
    )


@mcp.tool()
async def mithril_quarantine_list() -> str:
    """
    List memory claims Mithril blocked (quarantined / rejected / under review).

    Lets an agent or operator inspect exactly what was kept out of memory and
    why — the provenance trail behind every blocked write.
    """
    await _ensure_ready()
    rows = await _firewall.get_quarantine()
    if not rows:
        return "Quarantine is empty — no blocked claims."

    out = [f"{len(rows)} blocked claim(s):", ""]
    for row in rows[:20]:
        out.append(
            f"  [{row['status'].upper()}] {row['text'][:80]} "
            f"(source: {row['source']}, score: {row['trust_score']:.2f})"
        )
    return "\n".join(out)


@mcp.tool()
async def mithril_source_reputation() -> str:
    """
    Show Mithril's current, adaptive trust score for each source.

    Reputation is not static — sources caught contradicting verified memory
    lose trust over time, and corroborated sources gain it.
    """
    await _ensure_ready()
    rows = await _firewall.get_reputation()
    out = ["Live source reputation:", ""]
    for row in rows:
        delta = row.get("delta", 0.0)
        arrow = " ▼" if delta < -0.005 else (" ▲" if delta > 0.005 else "")
        out.append(
            f"  {row['source']:<18} {row['reputation']:.2f}{arrow}"
            f"   (prior {row['prior']:.2f}, "
            f"{row['accept_count']} ok / {row['block_count']} blocked)"
        )
    return "\n".join(out)


def main() -> None:
    """Run the MCP server over stdio (the transport Claude Desktop uses)."""
    mcp.run()


if __name__ == "__main__":
    main()
