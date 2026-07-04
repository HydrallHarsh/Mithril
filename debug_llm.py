"""Quick debug script to isolate the LLM connection issue."""
import asyncio
import os
from dotenv import load_dotenv

load_dotenv()

async def main():
    endpoint = os.getenv("LLM_ENDPOINT", "")
    api_key = os.getenv("LLM_API_KEY", "")
    model = os.getenv("LLM_MODEL", "")

    # Strip prefixes like Mithril does
    for prefix in ("openai/", "openrouter/", "custom/", "agentrouter/"):
        if model.startswith(prefix):
            model = model[len(prefix):]
            break

    print(f"Endpoint: {endpoint}")
    print(f"Model:    {model}")
    print(f"API Key:  {api_key[:10]}...")

    # Test 1: Raw HTTP request (no openai library)
    print("\n--- Test 1: Raw HTTP with aiohttp ---")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{endpoint}/chat/completions",
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": "Say hello"}],
                    "max_tokens": 10,
                },
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                print(f"  Status: {resp.status}")
                body = await resp.text()
                print(f"  Body: {body[:200]}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")

    # Test 2: AsyncOpenAI (same as Mithril uses)
    print("\n--- Test 2: AsyncOpenAI client ---")
    try:
        from openai import AsyncOpenAI
        client = AsyncOpenAI(base_url=endpoint, api_key=api_key)
        response = await client.chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": "Say hello"}],
            max_tokens=10,
            temperature=0.0,
        )
        print(f"  Success: {response.choices[0].message.content}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")

    # Test 3: Check if Ollama is reachable at all
    print("\n--- Test 3: Ollama /api/tags ---")
    try:
        import aiohttp
        async with aiohttp.ClientSession() as session:
            # Ollama native endpoint (not OpenAI-compatible)
            base = endpoint.replace("/v1", "")
            async with session.get(f"{base}/api/tags", timeout=aiohttp.ClientTimeout(total=10)) as resp:
                print(f"  Status: {resp.status}")
                data = await resp.json()
                models = [m["name"] for m in data.get("models", [])]
                print(f"  Available models: {models}")
    except Exception as e:
        print(f"  Error: {type(e).__name__}: {e}")

if __name__ == "__main__":
    asyncio.run(main())
