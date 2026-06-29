.PHONY: demo vanilla test api reset clean

# Run the full attack demo
demo:
	.venv\Scripts\python.exe demo/run_demo.py

# Run the vanilla (no firewall) demo
vanilla:
	.venv\Scripts\python.exe demo/vanilla_demo.py

# Seed legitimate policies
seed:
	.venv\Scripts\python.exe demo/seed_data.py

# Run unit tests
test:
	.venv\Scripts\python.exe -m pytest tests/ -v

# Start FastAPI backend
api:
	.venv\Scripts\python.exe -m uvicorn api.main:app --port 8000 --reload

# Reset all data (Cognee + local DBs)
reset:
	.venv\Scripts\python.exe -c "import asyncio; import cognee; asyncio.run(cognee.forget(everything=True))"
	del /f .mithril_audit.db 2>nul
	del /f .mithril_quarantine.db 2>nul
	del /f .memory_firewall_audit.db 2>nul
	del /f .memory_firewall_quarantine.db 2>nul
	@echo Reset complete.

# Install dependencies
install:
	uv pip install -e ".[dev]"

# Clean generated files
clean:
	del /f .mithril_audit.db 2>nul
	del /f .mithril_quarantine.db 2>nul
	del /f .memory_firewall_audit.db 2>nul
	del /f .memory_firewall_quarantine.db 2>nul
