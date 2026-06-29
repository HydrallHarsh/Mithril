"""
Mithril Demo — Seed Data
==================================
Pre-loads legitimate security policies through the firewall.
Run: python demo/seed_data.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

# ANSI colors
GREEN = "\033[92m"
RESET = "\033[0m"
BOLD  = "\033[1m"


LEGITIMATE_POLICIES = [
    ("Passwords must be hashed using Argon2id algorithm.", "Security Policy"),
    ("Argon2id requires minimum cost factor of 12.", "Security Policy"),
    ("bcrypt is acceptable as a fallback hashing algorithm.", "Official Docs"),
]


async def seed():
    from mithril.firewall import Mithril

    firewall = Mithril()
    await firewall.setup()

    print(f"\n{BOLD}Seeding legitimate security policies...{RESET}\n")

    for text, source in LEGITIMATE_POLICIES:
        result = await firewall.remember(text=text, source=source, author="seed_script")
        score = result.trust_breakdown.final_score
        status = result.status.value.upper()
        print(f"  {GREEN}✅ {status}{RESET}  (score: {score:.2f})  {text[:60]}")

    print(f"\n{GREEN}{BOLD}Done — {len(LEGITIMATE_POLICIES)} policies seeded.{RESET}\n")


if __name__ == "__main__":
    asyncio.run(seed())
