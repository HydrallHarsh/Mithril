"""Shared helpers for Cognee recall results and serialization."""

from __future__ import annotations

import re
from typing import Any


def extract_recall_texts(results: Any) -> list[str]:
    """Normalize Cognee recall results into plain text chunks."""
    if not results:
        return []

    if not isinstance(results, list):
        results = [results]

    parts: list[str] = []
    for item in results:
        text = ""
        if hasattr(item, "text"):
            text = str(item.text)
        elif hasattr(item, "content"):
            text = str(item.content)
        elif isinstance(item, dict):
            text = str(item.get("text", item.get("content", item)))
        else:
            text = str(item)

        # Parse Cognee 1.2+ graph context format
        if "__node_content_start__" in text:
            chunks = re.findall(
                r"__node_content_start__(.*?)__node_content_end__", 
                text, 
                flags=re.DOTALL
            )
            for chunk in chunks:
                chunk = chunk.strip()
                # Filter out useless 1-word meta nodes
                if chunk and chunk.lower() not in ("none", "concept", "parameter", "policy", "hashing algorithm"):
                    parts.append(chunk)
        else:
            parts.append(text)

    return [p.strip() for p in parts if p.strip()]
