import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const code=await readFile(path.join(root,'frontend','company-updates.js'),'utf8');
const html=await readFile(path.join(root,'frontend','index.html'),'utf8');

class FakeElement {
 constructor(tag='div'){
  this.tag=tag;this.value='';this.children=[];this._text='';
  this.listeners={};this.attributes={};this.dataset={};this.href='';
 }
 set textContent(value){this._text=String(value);this.children=[]}
 get textContent(){return [this._text,...this.children.map(x=>x.textContent)].filter(Boolean).join(' ')}
 appendChild(child){this.children.push(child);return child}
 replaceChildren(...children){this._text='';this.children=children}
 addEventListener(name,callback){this.listeners[name]=callback}
 setAttribute(k,v){this.attributes[k]=v}
}
function createEnvironment(feed,companies=[{id:'actym',name:'Actym Therapeutics'},{id:'neobe',name:'Neobe Therapeutics'}]){
 const nodes=new Map();
 const element=id=>{
  if(!nodes.has(id))nodes.set(id,new FakeElement());
  return nodes.get(id);
 };
 element('companySourceUpdates');element('reviewPlatform').value='actym';
 element('companyUpdateScope').value='selected';
 const callbacks=[];
 const document={
  getElementById:element,
  createElement:tag=>new FakeElement(tag),
  hidden:false,
  addEventListener:(name,fn)=>{if(name==='DOMContentLoaded')callbacks.push(fn)}
 };
 const fetch=async url=>({ok:true,json:async()=>url.startsWith('company_dossiers.json')?{companies}:feed});
 vm.runInNewContext(code,{document,fetch,setInterval:()=>1,Date,Promise,console});
 return {nodes,element,callbacks};
}
async function flush(){for(let i=0;i<24;i++)await Promise.resolve();}

test('public monitor has a visible panel and correct workflow link',()=>{
 assert.match(html,/id="companySourceUpdates"/);
 assert.match(html,/id="companyUpdateFeed"/);
 assert.match(html,/src="company-updates\.js"/);
 assert.match(html,/actions\/workflows\/company-source-monitor\.yml/);
 assert.doesNotThrow(()=>new vm.Script(code));
});

test('before first successful scan, no news, success or current trial status is fabricated',async()=>{
 const env=createEnvironment({version:1,status:'waiting_first_run',last_successful_check_at:null,items:[]});
 env.callbacks.forEach(fn=>fn());await flush();
 assert.match(env.element('companyMonitorState').textContent,/awaiting/i);
 assert.match(env.element('companyUpdateFeed').textContent,/first scheduled source scan/i);
});

test('selected company, all-company mode, and source links render as unreviewed leads',async()=>{
 const feed={version:1,status:'ok',last_successful_check_at:'2026-11-23T18:00:00.000Z',companies_monitored:20,checks_failed:0,items:[
  {company_id:'actym',id:'ctgov:NCT12345678',kind:'clinical_trial',title:'ACTM-838 Phase 1',reported_status:'RECRUITING',source_url:'https://clinicaltrials.gov/study/NCT12345678',first_seen_at:'2026-11-23T18:00:00.000Z'},
  {company_id:'neobe',id:'epmc:MED:12345678',kind:'publication',title:'Neobe NEO22 study',source_url:'https://pubmed.ncbi.nlm.nih.gov/12345678/',first_seen_at:'2026-11-23T18:00:00.000Z'}
 ]};
 const env=createEnvironment(feed);env.callbacks.forEach(fn=>fn());await flush();
 assert.match(env.element('companyUpdateFeed').textContent,/ACTM-838 Phase 1/);
 assert.doesNotMatch(env.element('companyUpdateFeed').textContent,/Neobe NEO22/);
 assert.match(env.element('companyUpdateFeed').textContent,/not an independent company-program conclusion/);
 const scope=env.element('companyUpdateScope');scope.value='all';scope.listeners.change();
 assert.match(env.element('companyUpdateFeed').textContent,/Neobe NEO22/);
 assert.match(env.element('companyUpdateMeta').textContent,/20 companies watched/);
});
