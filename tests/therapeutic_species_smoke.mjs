import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'frontend','index.html'),'utf8');
const speciesData=JSON.parse(fs.readFileSync(path.join(root,'frontend','therapeutic_species.json'),'utf8'));
const script=fs.readFileSync(path.join(root,'frontend','therapeutic-species.js'),'utf8');
const companies=JSON.parse(fs.readFileSync(path.join(root,'frontend','company_dossiers.json'),'utf8'));

test('species data is complete, source-linked, and strain-specific',()=>{
 assert.ok(speciesData.entries.length>=18);
 assert.equal(new Set(speciesData.entries.map(x=>x.id)).size,speciesData.entries.length);
 for(const row of speciesData.entries){
  for(const k of ['id','name','strain','category','gram','modality','stage','mechanism','delivery','evidence']){
   assert.ok(row[k],row.id+' missing '+k);
  }
  assert.ok(Array.isArray(row.components)&&row.components.length>=2,row.id+' missing components');
  assert.ok(Array.isArray(row.indications)&&row.indications.length>0,row.id+' missing indication');
  assert.ok(row.sources.length>0,row.id+' missing sources');
  for(const src of row.sources){
   assert.match(src.url,/^https:\/\//,row.id+' missing verified source link');
   assert.ok(src.label, row.id+' missing source title');
  }
  if(row.companies)assert.ok(companies.companies.some(x=>x.id===row.companies),row.id+' broken company link');
 }
});

test('only specific bacterial therapeutics have approved-use classifications',()=>{
 const approved=speciesData.entries.filter(x=>/approved/i.test(x.stage));
 assert.deepEqual(approved.map(x=>x.id).sort(),['bcg','rebyota','vowst']);
 assert.ok(!speciesData.entries.find(x=>x.id==='ecoli_nissle').stage.includes('approved'));
 assert.ok(speciesData.entries.find(x=>x.id==='faecalibacterium').gram.includes('Atypical'));
 assert.ok(speciesData.entries.find(x=>x.id==='salmonella').notes.includes('separate programs'));
});

test('the central Host–bacteria hotspot has accessible same-page controls',()=>{
 assert.match(html,/id="btiOpenSpecies"[^>]*aria-controls="btiSpeciesExplorer"/);
 assert.match(html,/id="btiSpeciesExplorer"[^>]*hidden/);
 assert.match(html,/id="btiCloseSpecies"/);
 assert.match(html,/id="btiSpeciesSearch"/);
 assert.match(html,/id="btiSpeciesGram"/);
 assert.match(html,/src="therapeutic-species\.js"/);
 assert.doesNotThrow(()=>new vm.Script(script));
});

class Element {
 constructor(tag='div'){
  this.tag=tag;this._text='';this.children=[];this.listeners={};this.attributes={};
  this.dataset={};this.value='';this.hidden=false;
 }
 set textContent(text){this._text=String(text);this.children=[]}
 get textContent(){return [this._text,...this.children.map(x=>x.textContent)].filter(Boolean).join(' ')}
 appendChild(child){this.children.push(child);return child}
 replaceChildren(...children){this._text='';this.children=children}
 addEventListener(event,fn){this.listeners[event]=fn}
 dispatchEvent(event){this.listeners[event.type]?.(event);return true}
 setAttribute(name,value){this.attributes[name]=value}
 focus(){this.focused=true}
 scrollIntoView(){}
}

test('clicking central node expands species list and filters without leaving homepage',async()=>{
 const nodes=new Map();
 const el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};
 el('btiSpeciesExplorer').hidden=true;
 el('btiSpeciesArea').value='all';
 el('btiSpeciesGram').value='all';
 el('btiSpeciesEvidence').value='all';
 const callbacks=[];
 const document={getElementById:el,createElement:tag=>new Element(tag),addEventListener:(event,cb)=>{if(event==='DOMContentLoaded')callbacks.push(cb)}};
 const fetch=async url=>{assert.equal(url,'therapeutic_species.json');return {ok:true,json:async()=>speciesData}};
 vm.runInNewContext(script,{window:{matchMedia:()=>({matches:false})},document,fetch,Event:class {constructor(name){this.type=name}},console});
 callbacks.forEach(cb=>cb());
 await el('btiOpenSpecies').listeners.click();
 assert.equal(el('btiSpeciesExplorer').hidden,false);
 assert.equal(el('btiSpeciesList').children.length,speciesData.entries.length);
 assert.match(el('btiSpeciesDetail').textContent,/Mycobacterium bovis BCG/);
 assert.equal(el('btiOpenSpecies').attributes['aria-expanded'],'true');
 el('btiSpeciesSearch').value='CBM588';
 el('btiSpeciesSearch').listeners.input();
 assert.equal(el('btiSpeciesList').children.length,1);
 assert.match(el('btiSpeciesDetail').textContent,/Clostridium butyricum/);
 assert.match(el('btiSpeciesDetail').textContent,/Butyrate|butyrate/);
 el('btiSpeciesSearch').value='';
 el('btiSpeciesSearch').listeners.input();
 el('btiSpeciesGram').value='Mixed';
 el('btiSpeciesGram').listeners.change();
 assert.equal(el('btiSpeciesList').children.length,2);
 el('btiCloseSpecies').listeners.click();
 assert.equal(el('btiSpeciesExplorer').hidden,true);
 assert.equal(el('btiOpenSpecies').attributes['aria-expanded'],'false');
});

test('associated company button navigates to an existing company research profile',async()=>{
 const nodes=new Map();
 const el=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id)};
 el('btiSpeciesExplorer').hidden=true;
 el('btiSpeciesArea').value='all';el('btiSpeciesGram').value='all';el('btiSpeciesEvidence').value='all';
 const callbacks=[];
 const document={getElementById:el,createElement:tag=>new Element(tag),addEventListener:(type,cb)=>{if(type==='DOMContentLoaded')callbacks.push(cb)}};
 const fetch=async()=>({ok:true,json:async()=>speciesData});
 vm.runInNewContext(script,{window:{matchMedia:()=>({matches:false})},document,fetch,Event:class{constructor(type){this.type=type}},console});
 callbacks.forEach(cb=>cb());
 await el('btiOpenSpecies').listeners.click();
 el('btiSpeciesSearch').value='AUP-55';el('btiSpeciesSearch').listeners.input();
 const btn=el('btiSpeciesDetail').children.find(x=>x.tag==='button');
 assert.ok(btn,'company navigation button not found');
 btn.listeners.click();
 assert.equal(el('workspaceSelect').value,'review');
 assert.equal(el('reviewPlatform').value,'aurealis');
});
