# Bacterial Therapeutics Intelligence — v1.3 discovery expansion

Run `START_BTI_WINDOWS.bat` inside `bti_multi_agent` on Windows. Requirements and configuration are unchanged from v1.2. Open `http://127.0.0.1:8000`, then select **Live evidence discovery & expanded graph** in the workspace dropdown.

- Use **Retrieve latest source records** to query PubMed ESearch/ESummary and ClinicalTrials.gov v2, then persist title/registry metadata in `data/discovery.sqlite3` (local SQLite).
- Use **Show saved evidence** and filters for source review; click original links. JSON export is available.
- **Explore linked concepts** derives search-domain and title-keyword graph edges. These are lexical annotations, not mechanistic or clinical findings. The separate curated evidence graph remains intact.
- No automatic background refresh; use the retrieve button. A network connection is required only to refresh; saved data can be reviewed offline while the backend is running.
- In localhost launcher mode, no BTI access token is required; hosted use requires configured authentication and production hardening (HTTPS, account management, protected persistence, auditing).
- Live retrieval metadata is *not* validated outcomes or full-text scientific appraisal; trial registrations do not imply effectiveness. No automatic patent search or freedom-to-operate confirmation is performed.
- Data stays on the local computer. The optional OpenAI agents use their existing separate API key, and may incur API charges.

## Commands

```
py -m pip install -r requirements.txt
py -m pytest -q
```

## Validation
Tests for API route behavior, local SQLite persistence, deduplication, fixed-query parameters, lexical links, and no-credential retrieval failure are included. No patient-level data is stored.
