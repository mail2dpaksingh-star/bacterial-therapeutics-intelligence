BACTERIAL THERAPEUTICS INTELLIGENCE — WINDOWS LOCAL QUICK START

1. Extract this entire ZIP.
2. Open PowerShell inside the bti_multi_agent folder, install dependencies once:
   py -m pip install -r requirements.txt
3. Double-click START_BTI_WINDOWS.bat
4. Optionally paste your existing OpenAI API key for the five AI agents; press Enter to skip it and use the evidence discovery features.
5. Open http://127.0.0.1:8000 and select Live Multi-Agent Intelligence.
6. No backend access token is needed in local mode. Enter a research question and click Run five research agents.

DO NOT deploy this launcher or BTI_LOCAL_MODE=1 on public servers. Production requires bearer token auth, HTTPS, per-user permissions, budget controls and security review. Keep the launcher bound to 127.0.0.1 only. The API key is kept in the active process environment; it is not written to disk by the launcher.

If the API isn't ready, check the key, model access, and API billing. Agent requests incur API charges. Live sources need internet access.

NEW v1.3: Live evidence discovery saves PubMed and ClinicalTrials.gov records into data/discovery.sqlite3. No AI key needed for discovery.

EXISTING v1.2: The Knowledge graph & evidence checks dropdown workspace works without a paid AI key, once the local Python server is running.
