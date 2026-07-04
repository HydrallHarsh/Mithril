"""
Mithril — Credential Exfiltration Guard
=======================================
Memory poisoning has a mirror-image threat: **credential planting**. An agent
(or a poisoned message it ingests) tries to write an API key, DB password, or
token *into* shared, permanent memory. Once it lands in the knowledge graph,
every future agent with recall access can read it back — a durable data leak.

Mithril treats this as an *attack on the trust system*, not just a privacy
scrub. When a claim carries a credential, Mithril:

1. **redacts** it at ingest, so Cognee / the LLM / the audit log never see the
   raw value (and again on recall, to catch memory that predates the firewall);
2. **penalizes the source's reputation** — a source caught planting credentials
   loses trust exactly like a source caught contradicting verified memory
   (see ``firewall.remember`` → ``reputation.update_on_decision``);
3. **records it** in the audit trail as attempted exfiltration.

Steps 2–3 are what make this part of Mithril's governance engine rather than a
standalone redactor.

Detection uses the same credential signatures the security industry relies on
(the shapes matched by gitleaks / trufflehog / GitHub secret scanning — AWS key
IDs, GitHub/Slack/Google/Stripe tokens, JWTs, PEM private keys, DB URIs with
inline creds, and labelled ``secret=…`` assignments). They are tuned for **high
precision** — a firewall that mangles ordinary prose is worse than none.
"""

from __future__ import annotations

import re
from dataclasses import dataclass

REDACTION_PLACEHOLDER = "[REDACTED:{kind}]"


@dataclass(frozen=True)
class SecretMatch:
    """One detected secret occurrence."""

    kind: str          # e.g. "aws_access_key", "jwt", "db_uri"
    value: str         # the raw matched text (never logged verbatim downstream)
    start: int
    end: int


# Ordered most-specific → most-general. Each entry:
#   (kind, compiled regex, group)
# ``group`` is the capture group holding the sensitive span to redact — 0 means
# the whole match. Using a group lets us keep surrounding context (a URI host,
# a ``password=`` label, the word ``Bearer``) while replacing only the secret.
# Python's ``re`` requires fixed-width lookbehind, so labels/prefixes are matched
# as (non-redacted) capture groups rather than lookbehinds.
_PATTERNS: list[tuple[str, re.Pattern, int]] = [
    # Private key PEM blocks
    ("private_key", re.compile(
        r"-----BEGIN (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----.*?-----END (?:RSA |EC |OPENSSH |DSA |PGP )?PRIVATE KEY-----",
        re.DOTALL,
    ), 0),
    # AWS access key IDs
    ("aws_access_key", re.compile(r"\b(?:AKIA|ASIA)[0-9A-Z]{16}\b"), 0),
    # GitHub tokens (classic + fine-grained)
    ("github_token", re.compile(r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"), 0),
    # Slack tokens
    ("slack_token", re.compile(r"\bxox[baprs]-[A-Za-z0-9-]{10,}\b"), 0),
    # Google API keys
    ("google_api_key", re.compile(r"\bAIza[0-9A-Za-z\-_]{35}\b"), 0),
    # OpenAI / OpenRouter / AgentRouter style keys
    ("openai_key", re.compile(r"\bsk-(?:or-|proj-|ant-)?[A-Za-z0-9\-_]{20,}\b"), 0),
    # Stripe keys
    ("stripe_key", re.compile(r"\b[rs]k_(?:live|test)_[A-Za-z0-9]{16,}\b"), 0),
    # JSON Web Tokens
    ("jwt", re.compile(r"\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\b"), 0),
    # DB connection URIs with inline credentials → redact only user:pass
    ("db_uri_credentials", re.compile(r"://([^\s:/@]+:[^\s:/@]+)@"), 1),
    # Bearer tokens in headers → keep "Bearer ", redact the token
    ("bearer_token", re.compile(r"(?i)bearer\s+([A-Za-z0-9\-_\.=]{16,})"), 1),
    # key=value / key: value secret assignments → keep the label, redact the value
    ("credential_assignment", re.compile(
        r"(?i)\b(?:password|passwd|pwd|secret|api[_-]?key|apikey|access[_-]?token|auth[_-]?token|client[_-]?secret)['\"]?\s*[=:]\s*['\"]?([^\s'\"]{6,})"
    ), 1),
]


def scan(text: str) -> list[SecretMatch]:
    """Return all secret matches in ``text`` (may overlap across pattern kinds)."""
    matches: list[SecretMatch] = []
    claimed: list[tuple[int, int]] = []

    for kind, pattern, group in _PATTERNS:
        for m in pattern.finditer(text):
            span = (m.start(group), m.end(group))
            if span[0] < 0:  # optional group didn't participate
                continue
            # Skip if fully inside an already-claimed (more specific) span.
            if any(span[0] >= c[0] and span[1] <= c[1] for c in claimed):
                continue
            matches.append(
                SecretMatch(kind=kind, value=m.group(group), start=span[0], end=span[1])
            )
            claimed.append(span)

    return sorted(matches, key=lambda x: x.start)


def contains_secret(text: str) -> bool:
    """True if ``text`` holds at least one detectable secret."""
    return bool(scan(text))


def redact_secrets(text: str) -> tuple[str, list[SecretMatch]]:
    """
    Replace every detected secret with a typed placeholder.

    Returns ``(redacted_text, matches)``. Redaction is applied right-to-left so
    earlier offsets stay valid. Surrounding context (URI host, ``password=``
    label) is preserved — only the sensitive span is replaced.
    """
    matches = scan(text)
    if not matches:
        return text, []

    redacted = text
    for m in sorted(matches, key=lambda x: x.start, reverse=True):
        placeholder = REDACTION_PLACEHOLDER.format(kind=m.kind)
        redacted = redacted[: m.start] + placeholder + redacted[m.end :]

    return redacted, matches
