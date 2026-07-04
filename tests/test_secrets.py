"""
Tests for mithril.secrets — the credential exfiltration guard.

Part 1: Pure/deterministic unit tests (no Cognee/LLM). Verifies each detector
fires, redaction replaces only the sensitive span, and ordinary prose is
never touched.

Part 2: Integration tests that push secret-bearing claims through the full
firewall pipeline and verify redaction, reputation damage, audit reasons,
recall-side scrubbing, and serialization output.
"""

from unittest.mock import AsyncMock, patch

import pytest

from mithril.firewall import Mithril
from mithril.models import AdmissionStatus, ContradictionResult
from mithril.secrets import contains_secret, redact_secrets, scan
from mithril.serialization import admission_result_to_dict


# ═══════════════════════════════════════════════════════════════════════════
# Part 1 — Unit tests (pure, no I/O)
# ═══════════════════════════════════════════════════════════════════════════


class TestDetectors:
    """Every detector kind fires on its canonical pattern."""

    @pytest.mark.parametrize(
        "text,kind",
        [
            ("Use AKIA1234567890ABCDEF for access", "aws_access_key"),
            ("token ghp_abcdefghijklmnopqrstuvwxyz0123456789", "github_token"),
            ("slack xoxb-123456789012-abcdefghijkl", "slack_token"),
            ("key AIzaSyA1234567890abcdefghijklmnopqrstuv", "google_api_key"),
            ("api_key=sk-or-v1-abcdefghijklmnopqrstuvwx", "openai_key"),
            ("stripe sk_live_abcdefghijklmnop1234", "stripe_key"),
            ("jwt eyJhbGciOi.eyJzdWIiOiI.abcDEFghiJKL", "jwt"),
            ("postgres://admin:s3cretpass@db:5432/prod", "db_uri_credentials"),
            ("Authorization: Bearer abcdef1234567890ABCDEF", "bearer_token"),
            ("password: hunter2xyz", "credential_assignment"),
        ],
    )
    def test_each_detector_fires(self, text, kind):
        kinds = [m.kind for m in scan(text)]
        assert kind in kinds, f"{kind} not detected in {text!r} (got {kinds})"


class TestRedaction:
    """Redaction replaces only the sensitive span, preserving context."""

    def test_redacts_the_value_not_the_label(self):
        redacted, matches = redact_secrets("password: hunter2xyz please")
        assert "hunter2xyz" not in redacted
        assert "password" in redacted  # label/context preserved
        assert "[REDACTED:credential_assignment]" in redacted
        assert len(matches) == 1

    def test_db_uri_keeps_host(self):
        redacted, _ = redact_secrets("postgres://admin:s3cretpass@db.internal:5432/prod")
        assert "s3cretpass" not in redacted
        assert "admin" not in redacted
        assert "db.internal:5432/prod" in redacted  # non-secret parts survive

    def test_multiple_secrets_all_removed(self):
        text = "key AKIA1234567890ABCDEF and token ghp_abcdefghijklmnopqrstuvwxyz0123456789"
        redacted, matches = redact_secrets(text)
        assert "AKIA1234567890ABCDEF" not in redacted
        assert "ghp_abcdefghijklmnopqrstuvwxyz0123456789" not in redacted
        assert len(matches) == 2

    def test_offsets_stay_valid_with_multiple(self):
        # Right-to-left redaction must not corrupt earlier matches.
        redacted, _ = redact_secrets(
            "a AKIA1234567890ABCDEF b AKIA9999999999ZZZZZZ c"
        )
        assert redacted.count("[REDACTED:aws_access_key]") == 2
        assert redacted.startswith("a ") and redacted.endswith(" c")


class TestNoFalsePositives:
    """Ordinary prose must never be mangled — a noisy firewall is worse than none."""

    @pytest.mark.parametrize(
        "text",
        [
            "Passwords must be hashed using Argon2id with cost factor 12.",
            "The engineering all-hands is the first Thursday of each month.",
            "MFA is mandatory for all employee accounts accessing production.",
            "Refunds above $500 require manager approval.",
            "Argon2id requires a minimum cost factor of twelve.",
            "The primary database is PostgreSQL 16.",
        ],
    )
    def test_clean_prose_untouched(self, text):
        redacted, matches = redact_secrets(text)
        assert matches == []
        assert redacted == text
        assert contains_secret(text) is False


class TestContainsSecret:
    def test_true_when_present(self):
        assert contains_secret("here is AKIA1234567890ABCDEF") is True

    def test_false_when_absent(self):
        assert contains_secret("just a normal sentence") is False


# ═══════════════════════════════════════════════════════════════════════════
# Part 1b — Detector edge cases
# ═══════════════════════════════════════════════════════════════════════════


class TestEdgeCases:
    """Corner cases: empty input, PEM blocks, already-redacted text, etc."""

    def test_empty_string(self):
        redacted, matches = redact_secrets("")
        assert redacted == ""
        assert matches == []

    def test_whitespace_only(self):
        redacted, matches = redact_secrets("   \n\t  ")
        assert matches == []
        assert redacted == "   \n\t  "

    def test_pem_private_key_block(self):
        pem = (
            "-----BEGIN RSA PRIVATE KEY-----\n"
            "MIIBogIBAAJBALpM5J9BqA1zL7O0e\n"
            "-----END RSA PRIVATE KEY-----"
        )
        text = f"Here is the key:\n{pem}\nDone."
        redacted, matches = redact_secrets(text)
        assert len(matches) == 1
        assert matches[0].kind == "private_key"
        assert "BEGIN RSA PRIVATE KEY" not in redacted
        assert "[REDACTED:private_key]" in redacted
        assert "Done." in redacted

    def test_ec_private_key_block(self):
        pem = (
            "-----BEGIN EC PRIVATE KEY-----\n"
            "MHQCAQEEIFooBarBazQuxABCDE\n"
            "-----END EC PRIVATE KEY-----"
        )
        matches = scan(pem)
        assert any(m.kind == "private_key" for m in matches)

    def test_already_redacted_is_idempotent(self):
        """Re-redacting an already-redacted string should not double-wrap."""
        original = "key AKIA1234567890ABCDEF"
        redacted_once, _ = redact_secrets(original)
        redacted_twice, second_matches = redact_secrets(redacted_once)
        assert redacted_twice == redacted_once
        assert second_matches == []

    def test_bearer_case_insensitive(self):
        for prefix in ("bearer", "Bearer", "BEARER"):
            text = f"Authorization: {prefix} abcdef1234567890ABCDEF"
            matches = scan(text)
            assert any(m.kind == "bearer_token" for m in matches), (
                f"Bearer detection failed for prefix '{prefix}'"
            )

    def test_credential_assignment_variants(self):
        """Various label formats: =, :, with/without quotes."""
        for label in ("password=", "secret:", "api_key=", "client_secret="):
            text = f"{label}SuperSecret12345"
            matches = scan(text)
            assert any(m.kind == "credential_assignment" for m in matches), (
                f"credential_assignment not detected for '{label}'"
            )

    def test_openai_key_variants(self):
        """sk-proj-, sk-ant-, sk-or- prefixes all match."""
        for key in (
            "sk-proj-abcdefghijklmnopqrstuv",
            "sk-ant-abcdefghijklmnopqrstuv",
            "sk-or-v1-abcdefghijklmnopqrstuv",
        ):
            matches = scan(key)
            assert any(m.kind == "openai_key" for m in matches), (
                f"openai_key not detected for '{key}'"
            )

    def test_multiple_mixed_kinds(self):
        """Text with several different secret kinds — all detected."""
        text = (
            "AWS key AKIA1234567890ABCDEF and "
            "Stripe rk_live_abcdefghijklmnop1234 plus "
            "password=TopsecretValue1"
        )
        redacted, matches = redact_secrets(text)
        kinds = {m.kind for m in matches}
        assert "aws_access_key" in kinds
        assert "stripe_key" in kinds
        assert "credential_assignment" in kinds
        assert "AKIA1234567890ABCDEF" not in redacted
        assert "TopsecretValue1" not in redacted

    def test_github_fine_grained_token(self):
        """Fine-grained tokens use ghs_ prefix."""
        token = "ghs_abcdefghijklmnopqrstuvwxyz0123456789"
        matches = scan(f"token: {token}")
        assert any(m.kind == "github_token" for m in matches)


# ═══════════════════════════════════════════════════════════════════════════
# Part 2 — Integration tests (firewall pipeline, mocked Cognee/LLM)
# ═══════════════════════════════════════════════════════════════════════════


@pytest.fixture
def firewall(tmp_path, monkeypatch):
    """Isolated firewall instance with tmp SQLite stores."""
    monkeypatch.setattr("mithril.quarantine.DB_PATH", str(tmp_path / "q.db"))
    monkeypatch.setattr("mithril.audit.DB_PATH", str(tmp_path / "a.db"))
    monkeypatch.setattr("mithril.reputation.DB_PATH", str(tmp_path / "rep.db"))
    return Mithril()


class TestFirewallSecretIntegration:
    """Secrets flowing through the full remember() pipeline."""

    @pytest.mark.asyncio
    async def test_remember_redacts_claim_text(self, firewall):
        """The claim stored in Cognee must have credentials stripped."""
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock) as cognee_remember,
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="DB: postgres://admin:s3cretpass@db:5432/prod",
                source="Security Policy",
            )

        # The raw password must not appear anywhere in the result.
        assert "s3cretpass" not in result.claim.text
        assert "[REDACTED:" in result.claim.text
        # Cognee.remember was called with the redacted text, not the raw.
        cognee_remember.assert_awaited_once()
        stored_text = cognee_remember.call_args.kwargs.get(
            "data", cognee_remember.call_args[1].get("data")
        )
        assert "s3cretpass" not in stored_text

    @pytest.mark.asyncio
    async def test_remember_populates_redacted_secrets_field(self, firewall):
        """AdmissionResult.redacted_secrets lists the kinds that were scrubbed."""
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="key AKIA1234567890ABCDEF",
                source="Security Policy",
            )

        assert "aws_access_key" in result.redacted_secrets
        assert len(result.redacted_secrets) >= 1

    @pytest.mark.asyncio
    async def test_secret_damages_source_reputation(self, firewall):
        """A credential-planting attempt must lower the source's reputation."""
        await firewall.setup()
        rep_before = await firewall.reputation.get("slack")

        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            # No contradiction — the ONLY bad signal is the secret.
            analyze.return_value = (ContradictionResult(found=False), 2)
            await firewall.remember(
                text="api_key=sk-or-v1-abcdefghijklmnopqrstuv",
                source="Slack",
            )

        rep_after = await firewall.reputation.get("slack")
        assert rep_after < rep_before, (
            f"Reputation should drop after credential planting: "
            f"{rep_before} → {rep_after}"
        )

    @pytest.mark.asyncio
    async def test_exfiltration_guard_reason_in_trust_breakdown(self, firewall):
        """Trust reasons must include the exfiltration-guard message."""
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="secret: ghp_abcdefghijklmnopqrstuvwxyz0123456789",
                source="Security Policy",
            )

        reasons_text = " ".join(result.trust_breakdown.reasons)
        assert "Exfiltration guard" in reasons_text
        assert "credential" in reasons_text.lower()

    @pytest.mark.asyncio
    async def test_clean_claim_has_no_redacted_secrets(self, firewall):
        """A claim without secrets must have an empty redacted_secrets list."""
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="All employees must complete security training.",
                source="Security Policy",
            )

        assert result.redacted_secrets == []

    @pytest.mark.asyncio
    async def test_multiple_secrets_all_tracked(self, firewall):
        """Multiple secrets in one claim are all listed in redacted_secrets."""
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="AWS AKIA1234567890ABCDEF and password=SuperSecret12",
                source="Slack",
            )

        assert len(result.redacted_secrets) >= 2
        kinds = set(result.redacted_secrets)
        assert "aws_access_key" in kinds
        assert "credential_assignment" in kinds


class TestRecallScrubbing:
    """Defense in depth: recall output is scrubbed even for pre-firewall memory."""

    @pytest.mark.asyncio
    async def test_recall_scrubs_secrets_from_results(self, firewall):
        await firewall.setup()
        leaked = "DB creds: postgres://admin:s3cretpass@db:5432/prod"
        with patch(
            "mithril.firewall.cognee.recall", new_callable=AsyncMock
        ) as mock_recall:
            # Simulate Cognee returning a result that contains a secret
            # (e.g., memory stored before the firewall was added).
            mock_recall.return_value = [leaked]
            recall_result = await firewall.recall_with_metadata("database info")

        assert "s3cretpass" not in recall_result.answer
        assert "[REDACTED:" in recall_result.answer


class TestSerializationOutput:
    """The API serializer includes the redacted_secrets field."""

    @pytest.mark.asyncio
    async def test_serialized_result_contains_redacted_secrets(self, firewall):
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="token sk_live_abcdefghijklmnop1234",
                source="Security Policy",
            )

        serialized = admission_result_to_dict(result)
        assert "redacted_secrets" in serialized
        assert "stripe_key" in serialized["redacted_secrets"]
        # Raw secret must not appear in the serialized text
        assert "abcdefghijklmnop1234" not in serialized["text"]

    @pytest.mark.asyncio
    async def test_serialized_clean_result_has_empty_list(self, firewall):
        await firewall.setup()
        with (
            patch(
                "mithril.firewall.analyze_against_verified_memory",
                new_callable=AsyncMock,
            ) as analyze,
            patch("mithril.firewall.cognee.remember", new_callable=AsyncMock),
        ):
            analyze.return_value = (ContradictionResult(found=False), 2)
            result = await firewall.remember(
                text="Use Argon2id for password hashing.",
                source="Security Policy",
            )

        serialized = admission_result_to_dict(result)
        assert serialized["redacted_secrets"] == []
