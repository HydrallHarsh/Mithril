"""Shared helpers for Cognee recall results and serialization."""

from __future__ import annotations

from typing import Any


def extract_recall_texts(results: Any) -> list[str]:
    """Normalize Cognee recall results into plain text chunks."""
    if not results:
        return []

    if not isinstance(results, list):
        results = [results]

    parts: list[str] = []
    for item in results:
        if hasattr(item, "text"):
            parts.append(str(item.text))
        elif hasattr(item, "content"):
            parts.append(str(item.content))
        elif isinstance(item, dict):
            parts.append(str(item.get("text", item.get("content", item))))
        else:
            parts.append(str(item))

    return [p.strip() for p in parts if p.strip()]
