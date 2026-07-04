import asyncio
import os
import re
from openai import AsyncOpenAI
from dotenv import load_dotenv
load_dotenv()

async def main():
    claim = "Hash the passwords using SHA-1 and nothing else"
    context = "Passwords must be hashed using Argon2id with a minimum cost factor of 12."
    
    prompt = f"""Does this new claim contradict the existing knowledge?

Existing knowledge: {context}

New claim: {claim}

Evaluate the contradiction from 0.0 to 1.0 where:
0.0 = no contradiction (consistent or unrelated)
0.5 = partial or ambiguous contradiction
1.0 = direct contradiction

You must wrap your final number in <score> and </score> tags.
Example: <score>1.0</score>"""

    client = AsyncOpenAI(
        base_url=os.getenv("LLM_ENDPOINT", "https://agentrouter.org/v1"),
        api_key=os.getenv("LLM_API_KEY", ""),
    )
    model = os.getenv("MITHRIL_LLM_MODEL") or os.getenv("LLM_MODEL", "claude-sonnet-4-5-20250929")
    for prefix in ("openai/", "openrouter/", "custom/", "agentrouter/"):
        if model.startswith(prefix):
            model = model[len(prefix) :]
            break

    try:
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            temperature=0.0,
        )
        raw = response.choices[0].message.content.strip()
        print("Raw output:", repr(raw))
    except Exception as e:
        print("Exception:", e)

if __name__ == '__main__':
    asyncio.run(main())
