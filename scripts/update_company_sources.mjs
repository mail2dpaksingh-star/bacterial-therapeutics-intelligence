import {readFile, writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SCRIPT_DIR, '..');

const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const isIsoDate = x => /^\d{4}-\d{2}-\d{2}/.test(String(x || ''));
const dateOrEmpty = value => isIsoDate(value) ? value.slice(0, 10) : '';
const cleanText = value => String(value ?? '').replace(/[\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320);
const uniqueTerms = terms => [...new Set((terms || []).map(cleanText).filter(x => x.length >= 3))].slice(0, 5);
const isoNow = date => new Date(date).toISOString();

async function fetchJson(url, fetcher, attempts = 2) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 14500);
    try {
      const response = await fetcher(url, {
        signal: controller.signal,
        headers: {'Accept': 'application/json', 'User-Agent': 'BTIResearchMonitor/1.0 (GitHub Actions, public research metadata)'}
      });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt + 1 < attempts) {
          await wait(900 * (attempt + 1));
          continue;
        }
        throw new Error('HTTP ' + response.status);
      }
      return await response.json();
    } catch (error) {
      if (attempt + 1 < attempts && (error.name === 'AbortError' || error.name === 'TypeError')) {
        await wait(900 * (attempt + 1));
        continue;
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error('Source temporarily unavailable');
}

export function trialUrl(terms, limit = 5) {
  // Only explicit company or distinct program names are searched; broad
  // class terms are intentionally excluded from the monitor configuration.
  const selected = uniqueTerms(terms).filter(x => x.length >= 4).slice(0, 3);
  const query = selected.map(x => '"' + x.replaceAll('"', '') + '"').join(' OR ');
  return 'https://clinicaltrials.gov/api/v2/studies?' + new URLSearchParams({
    'query.term': query,
    'pageSize': String(Math.max(1, Math.min(12, limit))),
    'format': 'json',
    'sort': 'LastUpdatePostDate:desc'
  });
}

export function literatureUrl(terms, limit = 5) {
  const selected = uniqueTerms(terms).slice(0, 4);
  const expr = selected.map(x => '"' + x.replaceAll('"', '') + '"').join(' OR ');
  const query = '(' + expr + ') sort_date:y';
  return 'https://www.ebi.ac.uk/europepmc/webservices/rest/search?' + new URLSearchParams({
    query, format: 'json', pageSize: String(Math.max(1, Math.min(12, limit))), resultType: 'lite'
  });
}

export function parseTrialStudies(payload, companyId, time) {
  const results = [];
  for (const entry of Array.isArray(payload?.studies) ? payload.studies : []) {
    const p = entry.protocolSection || {};
    const id = cleanText(p.identificationModule?.nctId);
    if (!/^NCT\d{8}$/.test(id)) continue;
    const status = cleanText(p.statusModule?.overallStatus).slice(0, 60);
    const update = dateOrEmpty(p.statusModule?.lastUpdatePostDateStruct?.date);
    const title = cleanText(p.identificationModule?.briefTitle || 'Clinical trial ' + id);
    results.push({
      id: 'ctgov:' + id, company_id: companyId,
      kind: 'clinical_trial', source: 'ClinicalTrials.gov',
      title, date: update || dateOrEmpty(p.statusModule?.studyFirstPostDateStruct?.date) || '',
      source_url: 'https://clinicaltrials.gov/study/' + id,
      trial_id: id, reported_status: status,
      first_seen_at: time, last_seen_at: time,
      review_status: 'unreviewed_source_lead'
    });
  }
  return results;
}

export function parseEuropePmc(payload, companyId, time) {
  const results = [];
  for (const entry of Array.isArray(payload?.resultList?.result) ? payload.resultList.result : []) {
    const source = cleanText(entry.source || 'MED').toUpperCase();
    const id = cleanText(entry.id);
    if (!/^[A-Z]{3,5}$/.test(source) || !/^[A-Za-z0-9._-]{2,45}$/.test(id)) continue;
    const pmid = cleanText(entry.pmid);
    const url = /^\d{6,10}$/.test(pmid) ? 'https://pubmed.ncbi.nlm.nih.gov/' + pmid + '/'
      : 'https://europepmc.org/article/' + source + '/' + encodeURIComponent(id);
    results.push({
      id: 'epmc:' + source + ':' + id, company_id: companyId,
      kind: 'publication', source: 'Europe PMC',
      title: cleanText(entry.title || 'Publication ' + id),
      date: dateOrEmpty(entry.firstPublicationDate) || (String(entry.pubYear || '').match(/^\d{4}$/) ? String(entry.pubYear) + '-01-01' : ''),
      source_url: url, journal: cleanText(entry.journalTitle),
      first_seen_at: time, last_seen_at: time,
      review_status: 'unreviewed_source_lead'
    });
  }
  return results;
}

export function mergeItems(previous, incoming, maxPerCompany = 28) {
  const map = new Map();
  for (const item of Array.isArray(previous) ? previous : []) {
    if (item && typeof item.id === 'string' && typeof item.company_id === 'string')
      map.set(item.company_id + '|' + item.id, item);
  }
  for (const item of incoming) {
    const key = item.company_id + '|' + item.id;
    const prior = map.get(key);
    if (prior) {
      const changed = item.kind === 'clinical_trial' &&
        (!!prior.reported_status && !!item.reported_status && prior.reported_status !== item.reported_status);
      map.set(key, {
        ...prior, ...item,
        first_seen_at: prior.first_seen_at,
        last_changed_at: changed ? item.last_seen_at : prior.last_changed_at,
        change_type: changed ? 'trial_registry_status_changed' : prior.change_type
      });
    } else {
      map.set(key, {...item, change_type: 'newly_discovered'});
    }
  }
  const grouped = new Map();
  for (const item of map.values()) {
    if (!grouped.has(item.company_id)) grouped.set(item.company_id, []);
    grouped.get(item.company_id).push(item);
  }
  const result = [];
  for (const items of grouped.values()) {
    items.sort((a,b) => String(b.last_changed_at || b.first_seen_at || '').localeCompare(String(a.last_changed_at || a.first_seen_at || '')));
    result.push(...items.slice(0,maxPerCompany));
  }
  return result.sort((a,b) => String(b.last_changed_at || b.first_seen_at || '').localeCompare(String(a.last_changed_at || a.first_seen_at || '')));
}

export async function updateCompanyMonitoring({
  root = ROOT, fetcher = globalThis.fetch, now = new Date(), pause = wait,
  save = true
} = {}) {
  const config = JSON.parse(await readFile(path.join(root,'scripts/company_monitor_config.json'),'utf8'));
  const dossiers = JSON.parse(await readFile(path.join(root,'frontend/company_dossiers.json'),'utf8'));
  const file = path.join(root,'frontend/live_updates.json');
  let previous = {items: []};
  try { previous = JSON.parse(await readFile(file,'utf8')); } catch (e) {
    if (e.code !== 'ENOENT') throw e;
  }
  const checkedAt = isoNow(now);
  const items = [], errors = [], perCompany = {};
  let successes = 0, checked = 0;
  const allowed = new Set(dossiers.companies.map(x=>x.id));
  const monitors = config.monitors || {};
  const limit = config.limit_per_source_per_company || 5;

  for (const [companyId, monitor] of Object.entries(monitors)) {
    if (!allowed.has(companyId) || monitor.enabled === false) continue;
    const terms = uniqueTerms(monitor.queries);
    if (!terms.length) continue;
    checked++;
    const companyResult = {clinical_trials: 0, publications: 0, errors: 0};
    for (const [source, url, parse] of [
      ['clinical_trials',trialUrl(terms,limit),parseTrialStudies],
      ['publications',literatureUrl(terms,limit),parseEuropePmc]
    ]) {
      try {
        const payload = await fetchJson(url,fetcher);
        const results = parse(payload,companyId,checkedAt);
        companyResult[source] = results.length;
        items.push(...results);
        successes++;
      } catch (error) {
        companyResult.errors++;
        errors.push({company_id: companyId,source,message: cleanText(error?.message).slice(0,120)});
      }
      await pause(config.request_interval_ms || 450);
    }
    perCompany[companyId] = companyResult;
  }

  // Failure must not replace the last known-good feed or falsely indicate a successful check.
  if (!successes) {
    throw new Error('All external-source requests failed. Retaining the previous published snapshot.');
  }

  const merged = mergeItems(previous.items,items);
  const before = new Set((previous.items||[]).map(x=>x.company_id+'|'+x.id));
  const newlyDiscovered = items.filter(x=>!before.has(x.company_id+'|'+x.id)).length;
  const result = {
    version: 1,
    mode: 'scheduled_public_source_metadata',
    last_checked_at: checkedAt,
    last_successful_check_at: checkedAt,
    status: errors.length ? 'partial' : 'ok',
    source_types: ['ClinicalTrials.gov','Europe PMC'],
    companies_monitored: checked,
    checks_successful: successes,
    checks_failed: errors.length,
    newly_discovered_in_run: newlyDiscovered,
    note: 'Unreviewed search matches only. A retrieved trial or publication does not establish a program status change, clinical efficacy, patent freedom to operate, or company endorsement.',
    items: merged,
    errors: errors.slice(0,40),
    per_company: perCompany
  };

  if (save) await writeFile(file,JSON.stringify(result,null,2)+'\n','utf8');
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  updateCompanyMonitoring()
    .then(data=>console.log('Company monitor:',data.companies_monitored,'companies;',data.items.length,'saved leads;',data.newly_discovered_in_run,'new;',data.checks_failed,'source errors.'))
    .catch(error=>{console.error('Company monitor failed:',error.message);process.exitCode=1});
}
