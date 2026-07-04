# import os
# import asyncio
# from dotenv import load_dotenv

# # Load the .env file variables
# load_dotenv()

# async def test_llm():
#     from openai import AsyncOpenAI
    
#     print("--- Testing LLM ---")
#     base_url = os.getenv("LLM_ENDPOINT", "https://agentrouter.org/v1")
#     api_key = os.getenv("LLM_API_KEY", "")
    
#     # Strip Litellm prefixes like "openai/" if they exist in the env var
#     model = os.getenv("LLM_MODEL", "gpt-4o-mini")
#     for prefix in ("openai/", "openrouter/", "custom/", "agentrouter/"):
#         if model.startswith(prefix):
#             model = model[len(prefix):]
#             break

#     print(f"Endpoint: {base_url}")
#     print(f"Model: {model}")
#     print(f"API Key: {'[HIDDEN]' if api_key else '[MISSING]'}")
    
#     if not api_key or api_key == "sk-your-agentrouter-api-key-here":
#         print("❌ Error: Valid LLM_API_KEY not found in .env\n")
#         return

#     client = AsyncOpenAI(base_url=base_url, api_key=api_key)
    
#     try:
#         response = await client.chat.completions.create(
#             model=model,
#             messages=[{"role": "user", "content": "Please reply with exactly two words: 'Connection successful'."}],
#             max_tokens=10,
#             temperature=0.0
#         )
#         reply = response.choices[0].message.content.strip()
#         print(f"✅ LLM Success! Response: '{reply}'\n")
#     except Exception as e:
#         print(f"❌ LLM Error: {e}\n")


# def test_embedding():
#     print("--- Testing Embeddings ---")
#     provider = os.getenv("EMBEDDING_PROVIDER", "fastembed")
    
#     if provider != "fastembed":
#         print(f"⚠️ Test script currently configured for fastembed. Your provider is: {provider}\n")
#         return

#     try:
#         from fastembed import TextEmbedding
#     except ImportError:
#         print("❌ Error: fastembed is not installed. Run `pip install fastembed`\n")
#         return

#     model_name = os.getenv("EMBEDDING_MODEL", "BAAI/bge-small-en-v1.5")
#     print(f"Provider: {provider}")
#     print(f"Model: {model_name}")
#     print("(Note: fastembed runs locally, so it may download the ~90MB model if it's the first time)")
    
#     try:
#         embedding_model = TextEmbedding(model_name=model_name)
#         embeddings = list(embedding_model.embed(["Hello world"]))
        
#         # embeddings is a list of arrays, we just check the first one
#         dim = len(embeddings[0])
#         print(f"✅ Embedding Success! Generated a vector with {dim} dimensions.\n")
#     except Exception as e:
#         print(f"❌ Embedding Error: {e}\n")


# async def main():
#     await test_llm()
#     test_embedding()

# if __name__ == "__main__":
#     asyncio.run(main())
from openai import OpenAI

client = OpenAI(
    api_key="sk-g6JthYSD39rowOrd7QMc69v4Y9qmNPsHJqCbhOtZK1C9F48k",
    base_url="https://agentrouter.org/v1",
)

# ── Basic chat completion ──────────────────────────────────────────────────────
response = client.chat.completions.create(
    model="claude-sonnet-4-5-20250929",
    messages=[
        {"role": "system", "content": "You are an expert software architect."},
        {"role": "user", "content": "Design a microservice architecture for an e-commerce platform."}
    ],
    temperature=0.5,
    max_tokens=2000,
)
print(response.choices[0].message.content)