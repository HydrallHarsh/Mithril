.PHONY: demo vanilla seed test api reset clean install dev

demo:
	.venv\Scripts\python.exe demo/run_demo.py

vanilla:
	.venv\Scripts\python.exe demo/vanilla_demo.py

seed:
	.venv\Scripts\python.exe demo/seed_data.py

test:
	.venv\Scripts\python.exe -m pytest tests/ -v

api:
	.venv\Scripts\python.exe -m uvicorn api.main:app --port 8000 --reload

dev:
	start cmd /c ".venv\Scripts\python.exe -m uvicorn api.main:app --port 8000 --reload"
	@echo FastAPI started on http://localhost:8000
	@echo Run 'make ui' in another terminal when the Next.js UI is added (master plan Day 5)

reset:
	.venv\Scripts\python.exe -c "import asyncio; import cognee; asyncio.run(cognee.forget(everything=True))"
	del /f .mithril_audit.db 2>nul
	del /f .mithril_quarantine.db 2>nul
	del /f .memory_firewall_audit.db 2>nul
	del /f .memory_firewall_quarantine.db 2>nul
	@echo Reset complete.

install:
	uv pip install -e ".[dev]"

clean:
	del /f .mithril_audit.db 2>nul
	del /f .mithril_quarantine.db 2>nul
	del /f .memory_firewall_audit.db 2>nul
	del /f .memory_firewall_quarantine.db 2>nul
