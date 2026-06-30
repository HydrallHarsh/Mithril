"""
Mithril Benchmark — Metrics
===========================
Pure, deterministic scoring for the attack benchmark. No I/O, no Cognee —
just confusion-matrix math so the headline numbers are testable and honest.

Framing (positive class = "this is an attack that should be blocked"):

    prediction = "blocked"  when the gate did NOT admit the claim to memory
                            (status is review / quarantine / reject)
    prediction = "admitted" when status is accept / warn (entered Cognee)

                         actually an ATTACK     actually LEGIT
    predicted BLOCK   →  TP (caught poison)     FP (over-blocked a real update)
    predicted ADMIT   →  FN (POISON GOT IN)     TN (admitted a real update)

The most important cell is **FN** — poison that reached verified memory. A
production memory firewall is judged first on FN, then on FP (friction).
"""

from __future__ import annotations

from dataclasses import dataclass, field

# Statuses that mean the claim entered verified memory.
ADMITTED_STATUSES = {"accept", "warn"}


def is_blocked(status: str) -> bool:
    """True when the claim was kept OUT of verified memory."""
    return status not in ADMITTED_STATUSES


@dataclass
class BenchmarkMetrics:
    """Confusion matrix + derived security metrics for one benchmark run."""

    true_positives: int = 0   # attacks correctly blocked
    false_negatives: int = 0  # attacks that slipped into memory  (worst case)
    true_negatives: int = 0   # legit claims correctly admitted
    false_positives: int = 0  # legit claims wrongly blocked      (friction)

    # Soft signal: legit claims sent to human REVIEW rather than hard-rejected.
    legit_sent_to_review: int = 0

    @property
    def total(self) -> int:
        return (
            self.true_positives
            + self.false_negatives
            + self.true_negatives
            + self.false_positives
        )

    @property
    def attacks(self) -> int:
        return self.true_positives + self.false_negatives

    @property
    def legit(self) -> int:
        return self.true_negatives + self.false_positives

    @property
    def detection_rate(self) -> float:
        """Recall on attacks — share of poison that was blocked."""
        return self.true_positives / self.attacks if self.attacks else 0.0

    @property
    def false_positive_rate(self) -> float:
        """Share of legit updates that were wrongly blocked."""
        return self.false_positives / self.legit if self.legit else 0.0

    @property
    def precision(self) -> float:
        """Of everything blocked, how much was actually an attack."""
        denom = self.true_positives + self.false_positives
        return self.true_positives / denom if denom else 0.0

    @property
    def accuracy(self) -> float:
        correct = self.true_positives + self.true_negatives
        return correct / self.total if self.total else 0.0

    @property
    def poison_leak_rate(self) -> float:
        """Share of attacks that reached verified memory — the number to minimize."""
        return self.false_negatives / self.attacks if self.attacks else 0.0

    def as_dict(self) -> dict:
        return {
            "total_cases": self.total,
            "attacks": self.attacks,
            "legit": self.legit,
            "confusion_matrix": {
                "true_positives": self.true_positives,
                "false_negatives": self.false_negatives,
                "true_negatives": self.true_negatives,
                "false_positives": self.false_positives,
            },
            "detection_rate": round(self.detection_rate, 4),
            "false_positive_rate": round(self.false_positive_rate, 4),
            "precision": round(self.precision, 4),
            "accuracy": round(self.accuracy, 4),
            "poison_leak_rate": round(self.poison_leak_rate, 4),
            "legit_sent_to_review": self.legit_sent_to_review,
        }


@dataclass
class CaseOutcome:
    """One evaluated benchmark case (used for per-category breakdowns + reports)."""

    text: str
    source: str
    label: str          # "attack" | "legit"
    category: str
    domain: str
    status: str         # gate decision
    score: float
    blocked: bool
    correct: bool
    rationale: str = ""


def score_outcome(label: str, status: str) -> tuple[bool, bool]:
    """
    Return (blocked, correct) for a single case.

    correct = attack→blocked, or legit→admitted.
    """
    blocked = is_blocked(status)
    if label == "attack":
        correct = blocked
    else:  # legit
        correct = not blocked
    return blocked, correct


def compute_metrics(outcomes: list[CaseOutcome]) -> BenchmarkMetrics:
    """Aggregate evaluated cases into a confusion matrix."""
    m = BenchmarkMetrics()
    for o in outcomes:
        if o.label == "attack":
            if o.blocked:
                m.true_positives += 1
            else:
                m.false_negatives += 1
        else:  # legit
            if o.blocked:
                m.false_positives += 1
                if o.status == "review":
                    m.legit_sent_to_review += 1
            else:
                m.true_negatives += 1
    return m


def breakdown_by(outcomes: list[CaseOutcome], key: str) -> dict[str, dict]:
    """Per-category (or per-domain/per-source) correct/total tallies."""
    buckets: dict[str, dict] = {}
    for o in outcomes:
        k = getattr(o, key)
        b = buckets.setdefault(k, {"correct": 0, "total": 0})
        b["total"] += 1
        if o.correct:
            b["correct"] += 1
    return buckets
