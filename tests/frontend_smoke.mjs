import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const frontend=path.join(root,'frontend');
const html=fs.readFileSync(path.join(frontend,'index.html'),'utf8');
const questionJs=fs.readFileSync(path.join(frontend,'scientific-question.js'),'utf8');
const communityJs=fs.readFileSync(path.join(frontend,'community.js'),'utf8');
const snapshot=JSON.parse(fs.readFileSync(path.join(frontend,'pathway_snapshot.json'),'utf8'));

test('every inline and external JavaScript block parses',()=>{
 const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(x=>x[1]).filter(x=>x.trim());
 assert.ok(scripts.length>6);
 scripts.forEach((script,i)=>assert.doesNotThrow(()=>new vm.Script(script,{filename:'inline-'+i+'.js'})));
 assert.doesNotThrow(()=>new vm.Script(questionJs));
 assert.doesNotThrow(()=>new vm.Script(communityJs));
});

test('every HTML element id is unique',()=>{
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 const seen=new Set();
 for(const id of ids){assert.ok(!seen.has(id),'duplicate id '+id);seen.add(id)}
});

test('public menu contains exactly six purposeful research tools',()=>{
 const match=html.match(/<select id="workspaceSelect"[\s\S]*?<\/select>/);
 assert.ok(match,'workspace selector');
 const opts=[...match[0].matchAll(/<option value="([^"]+)"/g)].map(x=>x[1]);
 assert.deepEqual(opts,['overview','journey','graph','library','atlas','community','review']);
 for(const name of opts.slice(1))assert.ok(html.includes('id="tab-'+name+'"'),'missing panel '+name);
});

test('static public UI does not show broken backend or token workspace',()=>{
 assert.ok(!html.includes('id="liveToken"'));
 assert.ok(!html.includes('id="tab-multi"'));
 assert.ok(!html.includes('id="tab-discovery"'));
 assert.ok(!/fetch\(['"]\/api\//.test(html));
 assert.ok(!html.includes('Backend required'));
 assert.ok(!html.includes('Start the Python server'));
 assert.ok(!html.includes('Start the Windows launcher'));
});

test('pathway and scientific question tools are connected',()=>{
 for(const id of ['homeResearchExplorer','homePath','homeOpenFull','homeDeepDive','tab-journey','graphQuery','graphResults','btiCuratedGraph','tab-community','blogFeed','reviewStatus']){
  assert.ok(html.includes('id="'+id+'"'),'missing interface '+id);
 }
 assert.ok(html.indexOf('id="graphQuery"')<html.indexOf('id="graphClaim"'));
 assert.ok(html.includes('window.btiShowPathwayDetails'));
 assert.ok(html.includes('src="scientific-question.js"'));
 assert.ok(html.includes('src="community.js"'));
});

test('SVG assets are present and valid document-shaped files',()=>{
 for(const asset of ['host-bacteria-interface.svg','bacterial-cell-architecture.svg','therapeutic-design-elements.svg']){
  const p=path.join(frontend,'assets',asset);
  assert.ok(fs.existsSync(p),'missing '+asset);
  const svg=fs.readFileSync(p,'utf8');
  assert.match(svg,/^<svg\b/);
  assert.match(svg,/<\/svg>\s*$/);
  assert.ok(html.includes('assets/'+asset),'illustration not linked '+asset);
 }
});

test('curated pathways have matching details and source urls',()=>{
 assert.ok(snapshot.overview.claims.length>=5);
 for(const claim of snapshot.overview.claims){
   assert.ok(snapshot.details[claim.id], 'missing pathway '+claim.id);
   for(const src of claim.curated_sources||[])assert.match(src.url,/^https:\/\//);
 }
});

class Element {
 constructor(tag){this.tag=tag;this.children=[];this._text='';this.attributes={};this.style={};this.value='';}
 set textContent(v){this._text=String(v);this.children=[];}
 get textContent(){return [this._text,...this.children.map(x=>x.textContent)].filter(Boolean).join(' ')}
 appendChild(n){this.children.push(n);return n}
 replaceChildren(...items){this._text='';this.children=items}
 setAttribute(k,v){this.attributes[k]=v}
 addEventListener(k,cb){this['on'+k]=cb}
}
test('inflammation question identifies SCFA and indoles rather than selected TMAO claim', async()=>{
 const elements=new Map();
 const doc={getElementById:id=>{if(!elements.has(id))elements.set(id,new Element('div'));return elements.get(id)},
  createElement:tag=>new Element(tag),
  addEventListener:()=>{}};
 const browserWindow={};
 const mockFetch=async()=>({ok:true,json:async()=>({resultList:{result:[{pmid:'38565643',title:'Short-chain fatty acids: linking diet, the microbiome and immunity',journalTitle:'Nature Reviews Immunology',firstPublicationDate:'2024-04-05'}]}})});
 vm.runInNewContext(questionJs,{window:browserWindow,document:doc,fetch:mockFetch,URLSearchParams,AbortController,setTimeout,clearTimeout,console});
 let report;
 await browserWindow.btiAskScientificQuestion({query:'Is there any bacterial metabolite that reduces inflammation?',claimId:'tmao',setReport:r=>{report=r}});
 const content=elements.get('graphResults').textContent;
 assert.match(content,/butyrate/i);
 assert.match(content,/indole/i);
 assert.ok(!content.includes('TMAO'),'unrelated selected claim contaminated answer');
 assert.deepEqual([...report.matched_topics],['scfa','indole']);
});
