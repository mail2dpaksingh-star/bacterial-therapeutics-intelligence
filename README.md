# Bacterial Therapeutics Intelligence

A research intelligence platform for bacterial therapeutics in oncology, cardiometabolic disease, and microbiome medicine.

## Status
The GitHub repository has been initialized for migration of the locally developed v1.7 application. **The application source code has not been uploaded yet**. The full public website and AI backend are not deployed.

## Architecture
- Frontend: HTML/JavaScript scientific research dashboard
- Backend: Python FastAPI, five AI research agents, PubMed / ClinicalTrials.gov connectors
- Local persistence: SQLite; production migration needed for hosted storage
- Hosting target: Cloudflare Pages for frontend; compatible secure backend hosting or a redesigned Cloudflare Worker for API

## Deployment prerequisites
1. Add the reviewed, sanitized application source code to this repository, preserving its directory structure.
2. Do not upload `.env`, API credentials, access tokens, personal research data, local SQLite databases, or `__pycache__`.
3. Choose a persistent cloud database and deploy the Python API behind authentication before enabling the AI features publicly.
4. Deploy the static frontend using Cloudflare Pages after its API base URL and error states have been adapted.
5. Store OpenAI credentials only in the backend hosting provider's secret store.

## Local use
The v1.7 ZIP contains `bti_multi_agent` and a Windows dashboard launcher. Run it locally according to its bundled README.

## Scientific scope
Evidence discovery is not verification of therapeutic efficacy. Mechanistic hypotheses, clinical findings, regulatory status, and patents must be evaluated separately. A patent-search lead does not constitute freedom-to-operate clearance.
