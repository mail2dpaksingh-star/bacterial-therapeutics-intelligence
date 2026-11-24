import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, mkdir, readFile, writeFile, rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {
 trialUrl, literatureUrl, parseTrialStudies, parseEuropePmc,
 mergeItems, updateCompanyMonitoring
} from '../scripts/update_company_sources.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const config=JSON.parse(await readFile(path.join(root,'scripts/company_monitor_config.json'),'utf8'));
const dossiers=JSON.parse(await readFile(path.join(root,'frontend/company_dossiers.json'),'utf8'));

test('monitor covers all company dossiers and intentionally excludes generic BCG record',()=>{
 assert.deepEqual(Object.keys(config.monitors).sort(),dossiers.companies.map(x=>x.id).sort());
 assert.equal(config.monitors.bcg.enabled,false);
 assert.equal(Object.values(config.monitors).filter(x=>x.enabled!==false).length,20);
 assert.ok(config.request_interval_ms>=200);
});

test('public source queries use program names and official unauthenticated APIs',()=>{
 const a=trialUrl(['ACTM-838','Actym Therapeutics'],5);
 const b=literatureUrl(['MUL001','Mulberry Biotherapeutics'],5);
 assert.match(a,/clinicaltrials\.gov\/api\/v2\/studies/);
 assert.match(a,/query\.term=/);
 assert.match(b,/ebi\.ac\.uk\/europepmc\/webservices\/rest\/search/);
 assert.match(b,/query=/);
 assert.ok(!a.includes('api_key'));
 assert.ok(!b.includes('api_key'));
});

test('trial parsing keeps sourced registry status without declaring clinical benefit',()=>{
 const example={studies:[{protocolSection:{
   identificationModule:{nctId:'NCT12345678',briefTitle:'ACTM-838 early clinical assessment'},
   statusModule:{overallStatus:'RECRUITING',lastUpdatePostDateStruct:{date:'2026-11-18'}}
 }}]};
 const records=parseTrialStudies(example,'actym','2026-11-23T00:00:00.000Z');
 assert.equal(records.length,1);
 assert.equal(records[0].reported_status,'RECRUITING');
 assert.equal(records[0].review_status,'unreviewed_source_lead');
 assert.equal(records[0].source_url,'https://clinicaltrials.gov/study/NCT12345678');
 assert.equal(records[0].date,'2026-11-18');
});

test('Europe PMC parsing retains PMID source and publication date',()=>{
 const example={resultList:{result:[{source:'MED',id:'12345678',pmid:'12345678',title:'Engineered bacteria preclinical study',pubYear:'2026',firstPublicationDate:'2026-09-09',journalTitle:'Example Journal'}]}};
 const records=parseEuropePmc(example,'neobe','2026-11-23T00:00:00.000Z');
 assert.equal(records.length,1);
 assert.equal(records[0].source_url,'https://pubmed.ncbi.nlm.nih.gov/12345678/');
 assert.equal(records[0].review_status,'unreviewed_source_lead');
 assert.equal(records[0].date,'2026-09-09');
});

test('merge deduplicates and records changes to the trial registry only',()=>{
 const first=parseTrialStudies({studies:[{protocolSection:{identificationModule:{nctId:'NCT12345678',briefTitle:'Study A'},statusModule:{overallStatus:'RECRUITING'}}}]},'actym','2026-11-23T00:00:00.000Z');
 const next=parseTrialStudies({studies:[{protocolSection:{identificationModule:{nctId:'NCT12345678',briefTitle:'Study A'},statusModule:{overallStatus:'COMPLETED'}}}]},'actym','2026-11-24T00:00:00.000Z');
 const initial=mergeItems([],first);
 const merged=mergeItems(initial,next);
 assert.equal(merged.length,1);
 assert.equal(merged[0].first_seen_at,'2026-11-23T00:00:00.000Z');
 assert.equal(merged[0].reported_status,'COMPLETED');
 assert.equal(merged[0].change_type,'trial_registry_status_changed');
 assert.equal(merged[0].review_status,'unreviewed_source_lead');
});

test('scheduled monitor writes a sourced feed while leaving curated clinical statuses unchanged',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'bti-monitor-'));
 try{
  await mkdir(path.join(directory,'scripts'),{recursive:true});
  await mkdir(path.join(directory,'frontend'),{recursive:true});
  await writeFile(path.join(directory,'scripts/company_monitor_config.json'),JSON.stringify({version:1,limit_per_source_per_company:2,request_interval_ms:200,monitors:{actym:{queries:['ACTM-838']}}}));
  const base={companies:[{id:'actym',programs:[{status:'Clinical evaluation reported'}]}]};
  await writeFile(path.join(directory,'frontend/company_dossiers.json'),JSON.stringify(base));
  const mockFetch=async url=>({
   ok:true,
   json:async()=> url.includes('clinicaltrials.gov')
    ?{studies:[{protocolSection:{identificationModule:{nctId:'NCT12345678',briefTitle:'ACTM-838 first-in-human study'},statusModule:{overallStatus:'RECRUITING',lastUpdatePostDateStruct:{date:'2026-11-20'}}}}]}
    :{resultList:{result:[{source:'MED',id:'12345678',pmid:'12345678',title:'ACTM-838 mechanistic evidence',firstPublicationDate:'2026-11-20'}]}}
  });
  const run=await updateCompanyMonitoring({root:directory,fetcher:mockFetch,now:new Date('2026-11-23T08:00:00.000Z'),pause:async()=>{}});
  assert.equal(run.items.length,2);
  assert.equal(run.checks_successful,2);
  assert.equal(run.status,'ok');
  assert.equal(run.newly_discovered_in_run,2);
  const written=JSON.parse(await readFile(path.join(directory,'frontend/live_updates.json'),'utf8'));
  assert.equal(written.items.length,2);
  const unchanged=JSON.parse(await readFile(path.join(directory,'frontend/company_dossiers.json'),'utf8'));
  assert.equal(unchanged.companies[0].programs[0].status,'Clinical evaluation reported');
 }finally{await rm(directory,{recursive:true,force:true})}
});

test('when all databases fail the last published feed remains intact',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'bti-monitor-error-'));
 try{
  await mkdir(path.join(directory,'scripts'),{recursive:true});
  await mkdir(path.join(directory,'frontend'),{recursive:true});
  await writeFile(path.join(directory,'scripts/company_monitor_config.json'),JSON.stringify({version:1,request_interval_ms:200,monitors:{actym:{queries:['ACTM-838']}}}));
  await writeFile(path.join(directory,'frontend/company_dossiers.json'),JSON.stringify({companies:[{id:'actym'}]}));
  const initial={version:1,status:'ok',items:[{company_id:'actym',id:'ctgov:NCT12345678'}]};
  await writeFile(path.join(directory,'frontend/live_updates.json'),JSON.stringify(initial));
  await assert.rejects(()=>updateCompanyMonitoring({root:directory,fetcher:async()=>{throw Error('network unavailable')},pause:async()=>{}}),/All external-source requests failed/);
  assert.deepEqual(JSON.parse(await readFile(path.join(directory,'frontend/live_updates.json'),'utf8')),initial);
 }finally{await rm(directory,{recursive:true,force:true})}
});
