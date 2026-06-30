"""
Tests for the Mithril benchmark — metrics math + dataset integrity.

Pure/deterministic: no Cognee or LLM calls. Validates the confusion-matrix
logic and that the labeled dataset is well-formed.
"""

import json
from pathlib import Path

import pytest

from benchmark.metrics import (
    CaseOutcome,
    breakdown_by,
    compute_metrics,
    is_blocked,
    score_outcome,
)

BENCH = Path(__file__).parent.parent / "benchmark"
VALID_LABELS = {"attack", "legit"}
ADMITTED = {"accept", "warn"}


def _case(label, status, category="x", domain="d"):
    blocked, correct = score_outcome(label, status)
    return CaseOutcome(
        text="t", source="s", label=label, category=category, domain=domain,
        status=status, score=0.5, blocked=blocked, correct=correct,
    )


class TestBlockedSemantics:
    @pytest.mark.parametrize("status", ["accept", "warn"])
    def test_admitted_statuses_not_blocked(self, status):
        assert is_blocked(status) is False

    @pytest.mark.parametrize("status", ["review", "quarantine", "reject"])
    def test_held_statuses_blocked(self, status):
        assert is_blocked(status) is True


class TestScoreOutcome:
    def test_attack_blocked_is_correct(self):
        assert score_outcome("attack", "reject") == (True, True)

    def test_attack_admitted_is_wrong(self):
        assert score_outcome("attack", "accept") == (False, False)

    def test_legit_admitted_is_correct(self):
        assert score_outcome("legit", "warn") == (False, True)

    def test_legit_blocked_is_wrong(self):
        assert score_outcome("legit", "quarantine") == (True, False)


class TestConfusionMatrix:
    def test_perfect_run(self):
        outcomes = [
            _case("attack", "reject"),
            _case("attack", "quarantine"),
            _case("legit", "accept"),
        ]
        m = compute_metrics(outcomes)
        assert (m.true_positives, m.false_negatives) == (2, 0)
        assert (m.true_negatives, m.false_positives) == (1, 0)
        assert m.detection_rate == 1.0
        assert m.poison_leak_rate == 0.0
        assert m.false_positive_rate == 0.0
        assert m.accuracy == 1.0

    def test_leaked_attack_counts_as_false_negative(self):
        m = compute_metrics([_case("attack", "accept")])
        assert m.false_negatives == 1
        assert m.detection_rate == 0.0
        assert m.poison_leak_rate == 1.0

    def test_over_blocked_legit_counts_as_false_positive(self):
        m = compute_metrics([_case("legit", "quarantine")])
        assert m.false_positives == 1
        assert m.false_positive_rate == 1.0

    def test_review_of_legit_tracked_separately(self):
        m = compute_metrics([_case("legit", "review")])
        assert m.false_positives == 1
        assert m.legit_sent_to_review == 1

    def test_precision_and_mixed(self):
        m = compute_metrics([
            _case("attack", "reject"),     # TP
            _case("attack", "accept"),     # FN
            _case("legit", "accept"),      # TN
            _case("legit", "reject"),      # FP
        ])
        assert m.precision == pytest.approx(0.5)   # 1 TP / (1 TP + 1 FP)
        assert m.detection_rate == pytest.approx(0.5)
        assert m.accuracy == pytest.approx(0.5)

    def test_empty_is_safe(self):
        m = compute_metrics([])
        assert m.detection_rate == 0.0
        assert m.accuracy == 0.0

    def test_breakdown_by_category(self):
        outcomes = [
            _case("attack", "reject", category="injection"),
            _case("attack", "accept", category="injection"),
            _case("attack", "reject", category="spoofing"),
        ]
        b = breakdown_by(outcomes, "category")
        assert b["injection"] == {"correct": 1, "total": 2}
        assert b["spoofing"] == {"correct": 1, "total": 1}


class TestDatasetIntegrity:
    def _load(self, name):
        rows = []
        for line in (BENCH / name).read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line:
                rows.append(json.loads(line))
        return rows

    def test_ground_truth_wellformed(self):
        rows = self._load("ground_truth.jsonl")
        assert len(rows) >= 5
        for r in rows:
            assert r["text"].strip()
            assert r["source"].strip()
            assert r["domain"].strip()

    def test_attack_suite_wellformed(self):
        rows = self._load("attack_suite.jsonl")
        assert len(rows) >= 20
        for r in rows:
            assert r["label"] in VALID_LABELS
            assert r["text"].strip()
            assert r["source"].strip()
            assert r["category"].strip()
            assert r["domain"].strip()
            assert r["rationale"].strip()

    def test_suite_has_both_classes(self):
        rows = self._load("attack_suite.jsonl")
        labels = {r["label"] for r in rows}
        assert labels == VALID_LABELS
        attacks = sum(1 for r in rows if r["label"] == "attack")
        legit = sum(1 for r in rows if r["label"] == "legit")
        assert attacks >= 15
        assert legit >= 5

    def test_suite_covers_key_attack_categories(self):
        rows = self._load("attack_suite.jsonl")
        cats = {r["category"] for r in rows if r["label"] == "attack"}
        for required in (
            "direct_contradiction",
            "authority_spoofing",
            "prompt_injection",
            "data_exfiltration",
        ):
            assert required in cats, f"missing attack category: {required}"
