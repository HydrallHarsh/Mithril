"""
Mithril — Ingestion Connectors
==============================
Turns real message feeds into governed memory writes. Instead of a human
typing one claim into a form, a whole feed (a Slack export, a text/JSONL file)
flows through Mithril's trust gate — and the poison in it gets caught.

Supported inputs
----------------
* **Slack export JSON** — the standard workspace-export shape: a JSON array of
  message objects (``{"type": "message", "user": ..., "text": ..., "ts": ...}``),
  or an object whose ``messages`` key holds that array. Bot/system/edited
  join-leave noise is skipped.
* **Generic file** — one claim per line (``.txt``) or one JSON object per line
  (``.jsonl`` with ``text``/``source``/``author`` keys).

Each parsed message becomes a :class:`MemoryClaim` and is run through
``Mithril.remember`` with ``source="Slack"`` (or the file's declared source),
preserving author and timestamp as real provenance.
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path

from .firewall import Mithril
from .models import AdmissionResult

logger = logging.getLogger(__name__)

# Slack subtypes that are channel noise, not content claims.
_SKIP_SUBTYPES = {
    "channel_join",
    "channel_leave",
    "channel_topic",
    "channel_purpose",
    "channel_name",
    "bot_message",
}


@dataclass
class ParsedMessage:
    """A normalized message ready to go through the firewall."""

    text: str
    author: str
    timestamp: datetime | None = None


def _slack_ts_to_dt(ts: str | float | None) -> datetime | None:
    """Slack timestamps are unix seconds as strings ('1719772800.001200')."""
    if ts is None:
        return None
    try:
        return datetime.fromtimestamp(float(ts), tz=timezone.utc)
    except (ValueError, TypeError, OSError):
        return None


def parse_slack_export(raw: object) -> list[ParsedMessage]:
    """
    Normalize a parsed Slack-export JSON document into message claims.

    Accepts either a bare list of message dicts or an object with a
    ``messages`` list (both shapes appear in real exports).
    """
    if isinstance(raw, dict):
        messages = raw.get("messages", [])
    elif isinstance(raw, list):
        messages = raw
    else:
        messages = []

    parsed: list[ParsedMessage] = []
    for msg in messages:
        if not isinstance(msg, dict):
            continue
        if msg.get("type", "message") != "message":
            continue
        if msg.get("subtype") in _SKIP_SUBTYPES:
            continue

        text = (msg.get("text") or "").strip()
        if not text:
            continue

        author = (
            msg.get("user_profile", {}).get("real_name")
            or msg.get("username")
            or msg.get("user")
            or "unknown"
        )
        parsed.append(
            ParsedMessage(
                text=text,
                author=str(author),
                timestamp=_slack_ts_to_dt(msg.get("ts")),
            )
        )
    return parsed


def load_slack_export(path: str | Path) -> list[ParsedMessage]:
    """Read and parse a Slack-export JSON file from disk."""
    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return parse_slack_export(raw)


def load_generic_file(path: str | Path) -> list[ParsedMessage]:
    """
    Read a plain ``.txt`` (one claim per line) or ``.jsonl`` file.

    For ``.jsonl`` each line may carry ``text`` (required) and optional
    ``author``; lines that fail to parse are skipped with a warning.
    """
    p = Path(path)
    lines = p.read_text(encoding="utf-8").splitlines()
    parsed: list[ParsedMessage] = []

    for line in lines:
        line = line.strip()
        if not line:
            continue
        if p.suffix == ".jsonl":
            try:
                obj = json.loads(line)
            except json.JSONDecodeError:
                logger.warning("Skipping unparseable JSONL line: %s", line[:60])
                continue
            text = (obj.get("text") or "").strip()
            if text:
                parsed.append(
                    ParsedMessage(text=text, author=str(obj.get("author", "unknown")))
                )
        else:
            parsed.append(ParsedMessage(text=line, author="unknown"))
    return parsed


async def ingest_messages(
    firewall: Mithril,
    messages: list[ParsedMessage],
    *,
    source: str,
) -> list[AdmissionResult]:
    """
    Run a batch of parsed messages through the firewall, in order.

    Order matters: earlier verified claims become the memory that later
    poisoned claims are checked against, so the feed behaves like a real
    timeline.
    """
    results: list[AdmissionResult] = []
    for msg in messages:
        result = await firewall.remember(
            text=msg.text,
            source=source,
            author=msg.author,
            metadata={"timestamp": msg.timestamp.isoformat() if msg.timestamp else None},
        )
        results.append(result)
    return results


async def ingest_slack_export(
    firewall: Mithril,
    path: str | Path,
    *,
    source: str = "Slack",
) -> list[AdmissionResult]:
    """Convenience: parse a Slack export file and ingest every message."""
    return await ingest_messages(firewall, load_slack_export(path), source=source)
