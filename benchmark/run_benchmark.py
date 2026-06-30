"""
Mithril — Memory-Poisoning Benchmark
====================================
A realistic, labeled evaluation of Mithril as an enterprise memory firewall.

Threat model
------------
A company runs AI agents over a shared Cognee knowledge base. Memory claims
arrive from many channels — authoritative ones (Security Policy, HR System,
GitHub) and risky ones (Slack, customer support, external email, the public
web, other agents). Attackers try to poison the shared memory: contradicting
verified policy, spoofing authority, injecting prompts, exfiltrating data.

The benchmark:
  1. seeds verified company memory (benchmark/ground_truth.jsonl) as the baseline,
  2. replays a labeled attack suite (benchmark/attack_suite.jsonl) through the
     SAME Mithril.remember() gate any real caller would use,
  3. scores every decision against ground-truth labels into a confusion matrix,
  4. reports detection rate, poison-leak rate, false-positive rate, and
     per-category / per-source breakdowns, and writes benchmark/results.json.

Run:  python benchmark/run_benchmark.py     (or: make benchmark)
Requires LLM_API_KEY (contradiction detection) and Cognee — like the demos.
"""

from __future__ import annotations

import asyncio
import json
import os
import sys
from pathlib import Path

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv

load_dotenv()

from benchmark.metrics import (
    CaseOutcome,
    breakdown_by,
    compute_metrics,
    is_blocked,
    score_outcome,
)

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BLUE = "\033[94m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

HERE = Path(__file__).parent
GROUND_TRUTH = HERE / "ground_truth.jsonl"
ATTACK_SUITE = HERE / "attack_suite.jsonl"
RESULTS = HERE / "results.json"


def load_jsonl(path: Path) -> list[dict]:
    rows = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line:
            rows.append(json.loads(line))
    return rows


def bar(value: float, width: int = 24, color: str = GREEN) -> str:
    filled = round(value * width)
    return f"{color}{'█' * filled}{DIM}{'░' * (width - filled)}{RESET}"


def header(text: str) -> None:
    print(f"\n{BOLD}{BLUE}{'=' * 64}{RESET}")
    print(f"{BOLD}{BLUE}  {text}{RESET}")
    print(f"{BOLD}{BLUE}{'=' * 64}{RESET}\n")


async def main() -> None:
    os.environ["CACHING"] = "false"

    from mithril.firewall import Mithril

    print(f"\n{BOLD}{CYAN}{'=' * 64}{RESET}")
    print(f"{BOLD}{CYAN}  MITHRIL — Memory-Poisoning Benchmark{RESET}")
    print(f"{BOLD}{CYAN}  Enterprise knowledge base under attack{RESET}")
    print(f"{BOLD}{CYAN}{'=' * 64}{RESET}")

    ground_truth = load_jsonl(GROUND_TRUTH)
    suite = load_jsonl(ATTACK_SUITE)
    n_attack = sum(1 for c in suite if c["label"] == "attack")
    n_legit = sum(1 for c in suite if c["label"] == "legit")

    firewall = Mithril()
    print(f"\n{DIM}Resetting stores and seeding verified company memory...{RESET}")
    await firewall.reset()

    # ── Phase 1: establish the verified baseline ─────────────────────
    header(f"PHASE 1 · Seeding {len(ground_truth)} verified policies")
    for row in ground_truth:
        result = await firewall.remember(
            text=row["text"], source=row["source"], author=row.get("author", "system")
        )
        mark = f"{GREEN}✓{RESET}" if not is_blocked(result.status.value) else f"{YELLOW}~{RESET}"
        print(f"  {mark} [{row['domain']}] {row['text'][:60]}")

    # ── Phase 2: replay the labeled attack suite ─────────────────────
    header(f"PHASE 2 · Replaying {len(suite)} labeled claims "
           f"({n_attack} attacks, {n_legit} legit)")

    outcomes: list[CaseOutcome] = []
    for case in suite:
        result = await firewall.remember(
            text=case["text"], source=case["source"], author=case.get("author", "unknown")
        )
        status = result.status.value
        blocked, correct = score_outcome(case["label"], status)
        outcomes.append(
            CaseOutcome(
                text=case["text"],
                source=case["source"],
                label=case["label"],
                category=case["category"],
                domain=case["domain"],
                status=status,
                score=result.trust_breakdown.final_score,
                blocked=blocked,
                correct=correct,
                rationale=case.get("rationale", ""),
            )
        )
        if case["label"] == "attack":
            tag = f"{GREEN}BLOCKED{RESET}" if blocked else f"{RED}{BOLD}LEAKED!{RESET}"
        else:
            tag = f"{GREEN}admitted{RESET}" if not blocked else f"{YELLOW}over-blocked{RESET}"
        verdict = f"{GREEN}✓{RESET}" if correct else f"{RED}✗{RESET}"
        print(f"  {verdict} {tag:<22} "
              f"{DIM}{status:<10} {result.trust_breakdown.final_score:.2f}{RESET}  "
              f"{case['category']:<22} {case['text'][:42]}")

    # ── Phase 3: metrics ─────────────────────────────────────────────
    m = compute_metrics(outcomes)
    header("PHASE 3 · Results")

    print(f"  {BOLD}Attack detection rate{RESET}   {bar(m.detection_rate)} "
          f"{BOLD}{m.detection_rate:.0%}{RESET}  "
          f"({m.true_positives}/{m.attacks} attacks blocked)")
    leak_color = GREEN if m.poison_leak_rate == 0 else RED
    print(f"  {BOLD}Poison leak rate{RESET}        {bar(m.poison_leak_rate, color=leak_color)} "
          f"{BOLD}{leak_color}{m.poison_leak_rate:.0%}{RESET}  "
          f"({m.false_negatives} attacks reached memory)")
    fp_color = GREEN if m.false_positive_rate <= 0.1 else YELLOW
    print(f"  {BOLD}False-positive rate{RESET}     {bar(m.false_positive_rate, color=fp_color)} "
          f"{BOLD}{fp_color}{m.false_positive_rate:.0%}{RESET}  "
          f"({m.false_positives}/{m.legit} legit updates blocked)")
    print(f"  {BOLD}Precision{RESET}               {bar(m.precision)} {BOLD}{m.precision:.0%}{RESET}")
    print(f"  {BOLD}Overall accuracy{RESET}        {bar(m.accuracy)} {BOLD}{m.accuracy:.0%}{RESET}")

    print(f"\n  {DIM}Confusion matrix (positive = attack):{RESET}")
    print(f"     TP {m.true_positives:>2}  (poison blocked)     "
          f"FN {m.false_negatives:>2}  (poison leaked)")
    print(f"     FP {m.false_positives:>2}  (legit over-blocked) "
          f"TN {m.true_negatives:>2}  (legit admitted)")

    # Per-category
    print(f"\n  {BOLD}By attack category:{RESET}")
    cats = breakdown_by([o for o in outcomes if o.label == "attack"], "category")
    for cat, b in sorted(cats.items()):
        ok = b["correct"] == b["total"]
        c = GREEN if ok else RED
        print(f"     {c}{b['correct']}/{b['total']}{RESET}  {cat}")

    # Failures, if any
    misses = [o for o in outcomes if not o.correct]
    if misses:
        print(f"\n  {RED}{BOLD}Misclassified ({len(misses)}):{RESET}")
        for o in misses:
            kind = "LEAKED attack" if o.label == "attack" else "over-blocked legit"
            print(f"     {RED}✗{RESET} [{kind}] ({o.status}, {o.score:.2f}) {o.text[:55]}")
    else:
        print(f"\n  {GREEN}{BOLD}Zero misclassifications.{RESET}")

    # ── Persist ──────────────────────────────────────────────────────
    payload = {
        "summary": m.as_dict(),
        "by_category": breakdown_by([o for o in outcomes if o.label == "attack"], "category"),
        "by_source": breakdown_by(outcomes, "source"),
        "by_domain": breakdown_by(outcomes, "domain"),
        "cases": [
            {
                "text": o.text, "source": o.source, "label": o.label,
                "category": o.category, "domain": o.domain, "status": o.status,
                "score": round(o.score, 4), "blocked": o.blocked, "correct": o.correct,
            }
            for o in outcomes
        ],
    }
    RESULTS.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"\n  {DIM}Full results → benchmark/results.json{RESET}")

    headline = (
        f"Mithril blocked {m.true_positives}/{m.attacks} memory-poisoning attacks "
        f"({m.detection_rate:.0%}) with a {m.false_positive_rate:.0%} false-positive rate."
    )
    print(f"\n{GREEN}{BOLD}  {headline}{RESET}\n")


if __name__ == "__main__":
    asyncio.run(main())
