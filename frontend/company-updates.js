/* Public company-update feed for Cloudflare Pages.
   The page reads published monitor outputs, not backend tokens or live AI.
   The optional GitHub raw mirror lets a scheduled feed update appear even if
   a Cloudflare deployment of an automated commit is delayed. */
(()=>{
'use strict';
const by=id=>document.getElementById(id);
const repo='mail2dpaksingh-star/bacterial-therapeutics-intelligence';
const raw='https://raw.githubusercontent.com/'+repo+'/main/frontend/live_updates.json';
const make=(tag,text,cls)=>{
 const x=document.createElement(tag);
 if(text!==undefined&&text!==null)x.textContent=String(text);
 if(cls)x.className=cls;
 return x;
};
const add=(node,tag,text,cls)=>{const x=make(tag,text,cls);node.appendChild(x);return x};
const dateLabel=date=>{
 if(!date)return 'Not checked yet';
 const time=Date.parse(String(date));
 if(!Number.isFinite(time))return 'Date unavailable';
 return new Date(time).toLocaleString();
};
const safeUrl=url=>typeof url==='string'&&
 /^https:\/\/(clinicaltrials\.gov\/study\/NCT\d{8}|pubmed\.ncbi\.nlm\.nih\.gov\/\d+\/?|europepmc\.org\/article\/[A-Za-z]+\/)/i.test(url);
let current=null,companies=new Map(),busy=false;
async function getJson(url){
 const response=await fetch(url,{cache:'no-store',headers:{Accept:'application/json'}});
 if(!response.ok)throw Error('HTTP '+response.status);
 const body=await response.json();
 if(!body||body.version!==1||!Array.isArray(body.items))throw Error('Unexpected monitor feed');
 return body;
}
function render(){
 const target=by('companyUpdateFeed'),state=by('companyMonitorState'),meta=by('companyUpdateMeta');
 if(!target||!state||!meta)return;
 target.replaceChildren();
 if(!current){state.textContent='Source updates not loaded';add(target,'div','Use Reload published updates to check the latest available feed.','company-updates-empty');return}
 const waiting=current.status==='waiting_first_run'||!current.last_successful_check_at;
 state.textContent=waiting?'Awaiting first scan':current.status==='partial'?'Partial source coverage':'Scheduled monitoring active';
 state.setAttribute('title',waiting?'First public source scan has not run':current.status==='partial'?'Some databases were unavailable during the latest scan':'Last public-source scan completed');
 const checked=current.last_successful_check_at;
 const monitorCount=Number(current.companies_monitored)||0,failed=Number(current.checks_failed)||0;
 meta.textContent=waiting
  ? 'First successful public source scan is pending. Scheduled scans are configured for the first day of each month at 08:17 UTC (subject to GitHub scheduling).'
  : 'Last successful scan: '+dateLabel(checked)+' · '+monitorCount+' companies watched · '+(current.items.length)+' published research leads'+(failed?' · '+failed+' source checks failed':'')+'.';
 const scope=by('companyUpdateScope')?.value||'selected',selected=by('reviewPlatform')?.value;
 let list=(current.items||[]).filter(item=>
  item&&typeof item.company_id==='string'&&
  (scope==='all'||item.company_id===selected)
 ).sort((a,b)=>String(b.last_changed_at||b.first_seen_at||'').localeCompare(String(a.last_changed_at||a.first_seen_at||''))).slice(0,10);
 if(waiting){add(target,'div','The first scheduled source scan has not completed. No live results are shown or implied. You can start the scan using the GitHub link above.','company-updates-empty');return}
 if(!list.length){
  const name=companies.get(selected)||'the selected company';
  add(target,'div',scope==='all'
   ?'No publication or trial-registry matches were returned by the completed source checks.'
   :'No matching clinical-trial or publication record has been discovered for '+name+' yet. This does not mean the program has stopped or that no research exists.','company-updates-empty');
  return;
 }
 for(const item of list){
  const row=add(target,'article',undefined,'company-update-record');
  const top=add(row,'div',undefined,'company-update-row');
  add(top,'span',item.kind==='clinical_trial'?'Clinical trial registry':'Research publication','company-update-source');
  if(scope==='all')add(top,'span',companies.get(item.company_id)||item.company_id);
  if(item.date)add(top,'span','Source date: '+String(item.date).slice(0,10));
  if(item.change_type==='trial_registry_status_changed')add(top,'span','Registry status changed since prior scan');
  const title=String(item.title||'Open public record').slice(0,260);
  if(safeUrl(item.source_url)){
   const a=add(row,'a',title+' ↗');a.href=item.source_url;a.target='_blank';a.rel='noopener noreferrer';
  }else add(row,'p',title);
  if(item.kind==='clinical_trial'&&item.reported_status){
   add(row,'p','Registry-reported status: '+String(item.reported_status).replaceAll('_',' ').slice(0,90)+' (not an independent company-program conclusion)');
  }
  if(item.kind==='publication'&&item.journal)add(row,'p',String(item.journal).slice(0,170));
  if(item.first_seen_at)add(row,'p','Discovered by monitor: '+dateLabel(item.first_seen_at));
 }
}
async function loadFeed(){
 if(busy)return;
 busy=true;
 const meta=by('companyUpdateMeta');
 if(meta)meta.textContent='Checking published source-monitor data…';
 try{
  const results=await Promise.allSettled([
   getJson('live_updates.json?cache='+Date.now()),
   getJson(raw+'?cache='+Date.now())
  ]);
  const available=results.filter(x=>x.status==='fulfilled').map(x=>x.value);
  if(available.length===0)throw Error('Unable to retrieve the published feed');
  available.sort((a,b)=>String(b.last_successful_check_at||'').localeCompare(String(a.last_successful_check_at||'')));
  current=available[0];
  render();
 }catch(_error){
  if(current){render();if(meta)meta.textContent+=' · Latest reload unavailable; showing the most recently loaded snapshot.'}
  else{
   if(meta)meta.textContent='The published update feed is not available. Check the GitHub workflow or deployment.';
   render();
  }
 }finally{busy=false}
}
async function loadCompanies(){
 try{
  const response=await fetch('company_dossiers.json',{cache:'force-cache'});
  if(response.ok){const json=await response.json();companies=new Map((json.companies||[]).map(c=>[c.id,c.name]));}
 }catch(_e){}
}
document.addEventListener('DOMContentLoaded',()=>{
 if(!by('companySourceUpdates'))return;
 by('companyUpdatesReload')?.addEventListener('click',loadFeed);
 by('companyUpdateScope')?.addEventListener('change',render);
 by('reviewPlatform')?.addEventListener('change',render);
 by('reviewPreclinicalOnly')?.addEventListener('change',()=>Promise.resolve().then(render));
 loadCompanies().finally(()=>loadFeed());
 setInterval(()=>{if(!document.hidden)loadFeed()},10*60*1000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadFeed()});
});
})();
