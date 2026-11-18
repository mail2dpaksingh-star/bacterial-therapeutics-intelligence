# Bacterial Therapeutics Intelligence v1.5 — Unified Discovery Dashboard

This release preserves v1.4 and adds an integrated interactive translational evidence workspace.

## Quick start on Windows

1. Unzip the application into a fresh folder.
2. Open `bti_multi_agent`.
3. Double-click `START_BTI_WINDOWS.bat`. The launcher runs the server in localhost-only mode; no BTI token is necessary locally.
4. Open http://127.0.0.1:8000, if the browser does not open automatically.
5. Select `Unified discovery dashboard` from the single `Choose a workspace` dropdown.
6. Select Oncology, Cardiometabolic or Microbiome, then a specific pathway. Click the four diagram nodes to read their limitations.
7. Follow original publication links, view previously saved discovery results, open patent search leads, or pass the pathway to five AI agents.

**No OpenAI key is required** to explore curated pathways. The five-agent AI research function requires `OPENAI_API_KEY` and paid API usage. Live PubMed and ClinicalTrials.gov discovery requires an internet connection and is manually initiated in the `Live Evidence Discovery` workspace.

## New components

- `backend/workbench.py` contains the curated disease-claim-pathway-to-source navigation and explicit rules for linking saved discovery records.
- `GET /api/workbench/overview` enumerates the curated scientific paths with evidence labels.
- `GET /api/workbench/pathway/{claim_id}` provides the 4-stage conceptual diagram, direct curated source links, *unreviewed* title-keyword-matched discovery leads, company comparator leads and a public patent-search URL.
- New dropdown workspace `Unified discovery dashboard` contains the clickable SVG mechanism diagram, disease and pathway selectors, source panels, clinical-study discovery leads, company comparators and patent prior-art search.
- The `Ask five AI agents`, `Evidence check` and `Update evidence` buttons take the selected scientific question into the existing workspaces.

## Evidence and IP boundaries

The four arrows display conceptual ordering, not proven causality. The evidence level applies to the specific curated claim and indication, never to another disease. Matched discovery records are keyword matches in titles only, not support for mechanisms or clinical efficacy. Trial registry metadata is not a verified result. Patent links are search leads; claims, jurisdiction, legal status, novelty, and freedom-to-operate are **not** automatically assessed.

The software does not design, manipulate, culture or optimize therapeutic organisms. Do not enter protected health information or confidential/proprietary sequences.

## Tests

Run `py -m pytest -q` from the extracted project directory. This package was tested with 19 automated tests; frontend scripts passed Node syntax validation; the unified dashboard's pathway selection, clickable nodes, and transfer-to-agent flow were tested in a Chromium browser with mocked evidence API responses. Real external API retrieval and production deployment remain unverified.

## Upgrading safely

Extract v1.5 into its own folder. If you have populated a v1.3/v1.4 local `data/discovery.sqlite3` file, stop all running servers and copy that file into v1.5's `bti_multi_agent/data/` directory before running v1.5. Never overwrite your original database; keep a backup first. The ZIP contains no user-specific research data.
