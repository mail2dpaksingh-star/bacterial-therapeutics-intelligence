# Bacterial Therapeutics Intelligence — Public Company Source Monitoring

## Purpose
Provides periodic **source discovery**, not autonomous verification of clinical development.
Tracks **20 organization-specific programs** from the 21 curated reference dossiers.
The broad licensed BCG clinical precedent is deliberately excluded from the
company-specific monitor to avoid conflating unrelated BCG studies.

## What it checks automatically
- **ClinicalTrials.gov API v2:** public trial metadata, NCT identifiers,
  registry-reported recruitment status, and last-update dates.
- **Europe PMC REST API:** publication and indexed research metadata.

The list of monitored exact names is maintained in `scripts/company_monitor_config.json`.
The updater runs in GitHub Actions using Node 22 and public unauthenticated APIs.
No OpenAI API key, website token, or private health data is required.

## When it checks
`.github/workflows/company-source-monitor.yml` uses a scheduled GitHub Actions
workflow at 00:17, 06:17, 12:17, and 18:17 UTC, plus an on-demand **Run workflow**
control in GitHub Actions.

GitHub scheduled workflows can be delayed, skipped under load, or disabled after
60 days of inactivity in public repositories. This is **near-real-time / periodic
monitoring**, not guaranteed continuous coverage.

## How to start the first scan
1. Go to GitHub → repository → **Actions**.
2. Open **Company research source updates**.
3. Click **Run workflow**, choose `main`, and confirm.
4. Check that the scan and publishing steps complete successfully.
5. Open your Cloudflare Pages site → **My Research Notes** and select a company.
   The new **Latest company research updates** area shows the source-check timestamp,
   any unreviewed findings, and original links. Use **Reload published updates**
   to re-read the published feed. That button does not itself run a remote scan.

If a workflow reports **permission denied** when committing:
- In repository **Settings → Actions → General**, allow workflow read/write
  permission if permitted by repository policy.
- Ensure a protected `main` branch is not blocking the workflow's write,
  or use an approved bot or pull-request-based data update process.

The workflow writes only `frontend/live_updates.json`; regular Cloudflare Pages
Git integration may deploy the new commit automatically. The webpage also attempts
to read the latest public copy directly from GitHub to reduce dependency on Pages
deployment timing. GitHub raw content and deployments may be cached or delayed.

## Scientific and privacy rules
- **Unreviewed leads are not automatically promoted** into curated
  `company_dossiers.json` status or efficacy claims.
- Trial recruitment status is distinct from the company's development program
  status; trial metadata can be delayed or incomplete.
- A newly indexed paper is not evidence of therapeutic benefit.
- False positives, missed sources, and public database outages are possible.
- Failed checks cannot wipe the most recently published successful feed.
- Each record is labeled with its source, date and discovery timestamp.
- The monitor does **not** yet continuously search company websites/press releases,
  SEC filings, patent office status, or other proprietary feeds. Those would need
  source-specific, legally compliant integrations and claim-level review.
- Patent-search links in the curated profile are research leads, not FTO opinions.

## Files
- `scripts/company_monitor_config.json`: exact search terms per organization
- `scripts/update_company_sources.mjs`: source ingestion and dedup
- `frontend/live_updates.json`: generated public data file
- `frontend/company-updates.js`: static website UI that reads published data
- `.github/workflows/company-source-monitor.yml`: scheduler/publisher
- `tests/company_monitor_smoke.mjs`: mocked API regression checks

## Operational maintenance
Review the output periodically to remove false positives and update company/program
search names. Curated company profiles should be updated only after checking
source documents with relevant publication/regulatory dates. The site deliberately
displays a last-successful-check timestamp rather than claiming it is always current.
