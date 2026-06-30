.PHONY: demo vanilla seed ingest mcp benchmark test api reset clean install dev ui ui-install ui-build

demo:
	.venv\Scripts\python.exe demo/run_demo.py

vanilla:
	.venv\Scripts\python.exe demo/vanilla_demo.py

seed:
	.venv\Scripts\python.exe demo/seed_data.py

ingest:
	.venv\Scripts\python.exe demo/ingest_demo.py

mcp:
	.venv\Scripts\python.exe -m mcp_server.server

benchmark:
	.venv\Scripts\python.exe benchmark/run_benchmark.py

test:
	.venv\Scripts\python.exe -m pytest tests/ -v

api:
	.venv\Scripts\python.exe -m uvicorn api.main:app --port 8000 --reload

ui:
	cd ui && npm run dev

ui-install:
	cd ui && npm install

ui-build:
	cd ui && npm run build

dev:
	start cmd /c ".venv\Scripts\python.exe -m uvicorn api.main:app --port 8000 --reload"
	cd ui && npm run dev

reset:
	.venv\Scripts\python.exe -c "import asyncio; import cognee; asyncio.run(cognee.forget(everything=True))"
	del /f .mithril_audit.db 2>nul
	del /f .mithril_quarantine.db 2>nul
	del /f .mithril_reputation.db 2>nul
	del /f .memory_firewall_audit.db 2>nul
	del /f .memory_firewall_quarantine.db 2>nul
	@echo Reset complete.

install:
	uv pip install -e ".[dev]"

clean:
	del /f .mithril_audit.db 2>nul
	del /f .mithril_quarantine.db 2>nul
	del /f .mithril_reputation.db 2>nul
	del /f .memory_firewall_audit.db 2>nul
	del /f .memory_firewall_quarantine.db 2>nul
