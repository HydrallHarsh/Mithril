"""
Mithril — Slack Ingestion Demo
==============================
Instead of typing one fake message into a form, this ingests a real Slack
**export file** (`demo/slack_export.json`) message-by-message through Mithril's
trust gate — and watches the poison in the channel get caught.

Run:  python demo/ingest_demo.py   (or: make ingest)
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

STATUS_STYLE = {
    "accept": (GREEN, "✅"),
    "warn": (YELLOW, "⚠️"),
    "review": (YELLOW, "🔍"),
    "quarantine": (RED, "🚫"),
    "reject": (RED, "❌"),
}

EXPORT_PATH = os.path.join(os.path.dirname(__file__), "slack_export.json")


async def main() -> None:
    os.environ["CACHING"] = "false"

    from mithril.firewall import Mithril
    from mithril.ingest import load_slack_export, ingest_messages

    print(f"\n{BOLD}{CYAN}{'=' * 62}{RESET}")
    print(f"{BOLD}{CYAN}  MITHRIL — Slack Channel Ingestion{RESET}")
    print(f"{BOLD}{CYAN}  Governing a real message feed, not a form{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 62}{RESET}\n")

    firewall = Mithril()
    print(f"{DIM}Resetting Cognee + Mithril stores...{RESET}")
    await firewall.reset()

    messages = load_slack_export(EXPORT_PATH)
    print(f"{DIM}Parsed {len(messages)} content messages from slack_export.json "
          f"(bot/system noise skipped){RESET}\n")

    rep_before = await firewall.reputation.get("Slack")

    results = await ingest_messages(firewall, messages, source="Slack")

    for msg, result in zip(messages, results):
        color, icon = STATUS_STYLE.get(result.status.value, (RESET, "•"))
        stored = "stored" if result.cognee_dataset else "blocked"
        print(f"  {icon} {color}{result.status.value.upper():<10}{RESET}"
              f"{DIM}@{msg.author:<20}{RESET} {msg.text[:52]}")
        print(f"     {DIM}score {result.trust_breakdown.final_score:.2f} · {stored}{RESET}")

    blocked = sum(
        1 for r in results if r.status.value in ("quarantine", "reject", "review")
    )
    rep_after = await firewall.reputation.get("Slack")

    print(f"\n{BOLD}  Ingested {len(results)} · "
          f"{GREEN}{len(results) - blocked} stored{RESET}{BOLD} · "
          f"{RED}{blocked} blocked{RESET}")

    arrow = f"{RED}▼{RESET}" if rep_after < rep_before else f"{GREEN}▲{RESET}"
    print(f"\n  {BOLD}Slack channel reputation:{RESET} "
          f"{rep_before:.2f} → {rep_after:.2f} {arrow}")
    print(f"  {DIM}The channel's trust adapted as poison flowed through it.{RESET}")

    print(f"\n  {BOLD}Now ask the governed memory:{RESET}")
    answer = await firewall.recall("How should we hash passwords?")
    for line in answer.split("\n"):
        if line.strip():
            print(f"    {GREEN}{line.strip()}{RESET}")
    print()


if __name__ == "__main__":
    asyncio.run(main())
