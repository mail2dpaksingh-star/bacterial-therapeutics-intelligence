import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const data=JSON.parse(fs.readFileSync(path.join(root,'frontend','company_dossiers.json'),'utf8'));
const js=fs.readFileSync(path.join(root,'frontend','company-research.js'),'utf8');

test('all listed company and precedent records have source-linked programs',()=>{
 assert.equal(data.companies.length,21);
 assert.equal(data.companies.reduce((n,p)=>n+p.programs.length,0),30);
 for(const company of data.companies){
  assert.ok(company.id&&company.name);
  assert.ok(company.sources.length>0,company.id+' has no sources');
  const ids=new Set(company.sources.map(s=>s.id));
  for(const program of company.programs){
   assert.ok(program.status&&program.outcome&&program.latest_report);
   assert.ok(program.source_ids.length>0,program.name+' missing references');
   for(const id of program.source_ids)assert.ok(ids.has(id),program.name+' missing cited record '+id);
  }
  for(const source of [...company.sources,...(company.patent_links||[])]){
   assert.match(source.url,/^https:\/\//,company.id+' bad URL');
  }
 }
});

test('clinical statuses reflect separate dated program outcomes',()=>{
 const find=id=>data.companies.find(p=>p.id===id);
 assert.equal(find('indaptus').programs[0].status,'Discontinued');
 assert.match(find('maat').programs[0].status,/negative/i);
 assert.match(find('vedanta').programs[0].status,/ongoing/i);
 assert.match(find('neobe').programs[0].phase,/preclinical/i);
 assert.equal(find('enterome').programs.length,3);
 assert.equal(find('bcg').programs[0].status,'Approved precedent');
 assert.match(find('aurexo').programs[0].phase,/preclinical/i);
 assert.match(find('aurealis').programs[0].phase,/preclinical/i);
 assert.match(find('seres').programs[0].phase,/preclinical/i);
 assert.match(find('medosome').programs[0].phase,/preclinical/i);
 assert.match(find('longhorn').classification,/adjacent/i);
 assert.match(find('bactheravax').classification,/adjacent/i);
});

class Element{
 constructor(tag='div'){
  this.tag=tag;this.children=[];this._text='';this.listeners={};this.value='';
  this.dataset={};this.style={};this.href='';this.attributes={};
 }
 set textContent(t){this.children=[];this._text=String(t)}
 get textContent(){return [this._text,...this.children.map(x=>x.textContent)].filter(Boolean).join(' ')}
 appendChild(x){this.children.push(x);if(this.tag==='select'&&!this.value)this.value=x.value||'';return x}
 replaceChildren(...items){this.children=items;this._text='';if(this.tag==='select')this.value=items[0]?.value||''}
 addEventListener(event,cb){this.listeners[event]=cb}
 dispatch(event){this.listeners[event]?.({target:this})}
}
test('company selection, focus controls, and related documents render without backend',async()=>{
 const elements=new Map();
 const get=id=>{if(!elements.has(id))elements.set(id,new Element(id==='reviewPlatform'?'select':'div'));return elements.get(id)};
 get('reviewPlatform').value='indaptus';
 get('reviewLens').value='overview';
 get('reviewArea').value='Oncology';
 const callbacks=[];
 const document={getElementById:get,createElement:t=>new Element(t),addEventListener:(type,cb)=>{if(type==='DOMContentLoaded')callbacks.push(cb)}};
 const fetch=async url=>{
  assert.equal(url,'company_dossiers.json');
  return {ok:true,json:async()=>data};
 };
 vm.runInNewContext(js,{document,fetch,console});
 for(const cb of callbacks)await cb();
 assert.match(get('companyDossier').textContent,/Decoy20/);
 assert.match(get('companyDossier').textContent,/Discontinued/);
 get('reviewPlatform').value='maat';get('reviewPlatform').dispatch('change');
 assert.match(get('companyDossier').textContent,/negative opinion/i);
 get('reviewLens').value='patents';get('reviewLens').dispatch('change');
 assert.match(get('companyDossier').textContent,/patent/i);
 get('reviewPlatform').value='vedanta';get('reviewPlatform').dispatch('change');
 assert.match(get('companyDossier').textContent,/Phase 3/i);
 assert.match(get('companyDossier').textContent,/ongoing/i);
 get('reviewPlatform').value='aurexo';get('reviewPlatform').dispatch('change');
 assert.match(get('companyDossier').textContent,/AeBEV-001/);
 get('reviewPreclinicalOnly').checked=true;get('reviewPreclinicalOnly').dispatch('change');
 assert.ok(get('reviewPlatform').children.length>=11);
 assert.ok(!get('reviewPlatform').children.some(o=>o.value==='indaptus'));
 assert.ok(get('reviewPlatform').children.some(o=>o.value==='seres'));
});
