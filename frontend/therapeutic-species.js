/* Same-page therapeutic bacterial species and strain explorer.
   Static source-linked data, no API tokens or extra pages. */
(()=>{
 'use strict';
 const by=id=>document.getElementById(id);
 const make=(tag,text,cls)=>{
  const el=document.createElement(tag);
  if(text!==undefined&&text!==null)el.textContent=String(text);
  if(cls)el.className=cls;
  return el;
 };
 const add=(parent,tag,text,cls)=>{const el=make(tag,text,cls);parent.appendChild(el);return el};
 let entries=[],activeId=null,loaded=false,loadPromise=null;
 const evidenceType=entry=>{
  const x=String(entry.stage||'').toLowerCase();
  if(x.includes('approved'))return'Approved';
  if(x.includes('preclinical')&&!/human|clinical|phase|probiotic/.test(x))return'Preclinical';
  if(x.includes('preclinical')&&/program|mechanistic/.test(x))return'Preclinical';
  return'Human';
 };
 const displayEvidence=code=>({Approved:'Approved indication',Human:'Human research or probiotic use',Preclinical:'Preclinical / exploratory'})[code]||'Research';
 function matching(){
  const term=(by('btiSpeciesSearch')?.value||'').trim().toLowerCase();
  const area=by('btiSpeciesArea')?.value||'all';
  const gram=by('btiSpeciesGram')?.value||'all';
  const evidence=by('btiSpeciesEvidence')?.value||'all';
  const platform=by('btiSpeciesPlatform')?.value||'all';
  return entries.filter(e=>{
   if(area!=='all'&&e.category!==area)return false;
   if(platform!=='all'&&e.platform_class!==platform)return false;
   if(gram!=='all'&&!String(e.gram).toLowerCase().includes(gram.toLowerCase()))return false;
   if(evidence!=='all'&&evidenceType(e)!==evidence)return false;
   if(term){
    const search=[e.name,e.strain,e.category,e.gram,e.modality,e.platform_class,e.stage,...(e.components||[]),...(e.indications||[])].join(' ').toLowerCase();
    if(!search.includes(term))return false;
   }
   return true;
  });
 }
 function fact(container,label,value){
  const el=add(container,'div',undefined,'bti-species-fact');
  add(el,'strong',label);
  add(el,'span',value);
 }
 function detail(entry){
  const dest=by('btiSpeciesDetail');
  if(!dest)return;
  dest.replaceChildren();
  if(!entry){add(dest,'p','No matching species. Adjust the search or filter selections.');return}
  const badges=add(dest,'div',undefined,'bti-species-badges');
  [entry.platform_class,entry.category,entry.gram,displayEvidence(evidenceType(entry))].forEach(x=>add(badges,'span',x));
  add(dest,'h3',entry.name);
  add(dest,'p',entry.strain,'bti-species-strain');
  const facts=add(dest,'div',undefined,'bti-species-facts');
  fact(facts,'Preparation class',entry.platform_class||'Not classified');
  fact(facts,'Therapeutic modality',entry.modality);
  fact(facts,'Clinical development evidence',entry.stage);
  fact(facts,'Disease / research focus',(entry.indications||[]).join(' · '));
  fact(facts,'Delivery context',entry.delivery);
  add(dest,'h4','Bacterial cell wall and key components');
  const componentList=add(dest,'ul',undefined,'bti-component-list');
  for(const c of entry.components||[])add(componentList,'li',c);
  add(dest,'h4','Proposed therapeutic mechanism');
  add(dest,'p',entry.mechanism);
  add(dest,'h4','Cargo or therapeutic function');
  add(dest,'p',entry.cargo);
  add(dest,'h4','Evidence and clinical interpretation');
  add(dest,'p',entry.evidence);
  if(entry.notes){add(dest,'h4','Strain or platform distinction');add(dest,'p',entry.notes)}
  add(dest,'h4','Source-linked publications and documents');
  const sources=add(dest,'ul',undefined,'bti-species-sources');
  for(const source of entry.sources||[]){
   const row=add(sources,'li');
   if(typeof source.url==='string'&&/^https:\/\//.test(source.url)){
    const a=add(row,'a',source.label+' ↗');
    a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';
   }else add(row,'span',source.label);
   add(row,'small',source.type);
  }
  if(entry.companies){
   const btn=add(dest,'button','View linked company research ↗','bti-species-company');
   btn.type='button';
   btn.addEventListener('click',()=>{
    const menu=by('workspaceSelect'),company=by('reviewPlatform');
    if(!menu||!company)return;
    menu.value='review';menu.dispatchEvent(new Event('change',{bubbles:true}));
    company.value=entry.companies;company.dispatchEvent(new Event('change',{bubbles:true}));
    by('companyIntelHeading')?.scrollIntoView({behavior:'smooth',block:'start'});
   });
  }
 }
 function render(){
  const dest=by('btiSpeciesList'),count=by('btiSpeciesCount');if(!dest)return;
  const rows=matching();
  dest.replaceChildren();
  if(!rows.some(e=>e.id===activeId))activeId=rows[0]?.id||null;
  if(count)count.textContent='Showing '+rows.length+' of '+entries.length+' source-linked species, strains or microbial communities';
  if(!rows.length){
   add(dest,'p','No matches. Try a broader scientific term or reset the filters.');
  }
  for(const e of rows){
   const btn=add(dest,'button',undefined);
   btn.type='button';
   btn.setAttribute('aria-current',String(e.id===activeId));
   btn.addEventListener('click',()=>{
    activeId=e.id;
    render();
    if(window.matchMedia?.('(max-width: 850px)').matches)
      by('btiSpeciesDetail')?.scrollIntoView({behavior:'smooth',block:'start'});
   });
   add(btn,'strong',e.name);
   add(btn,'small',e.strain);
   add(btn,'em',e.platform_class+' · '+e.category+' · '+displayEvidence(evidenceType(e)));
  }
  detail(rows.find(e=>e.id===activeId));
 }
 async function load(){
  if(loaded)return;
  if(!loadPromise)loadPromise=fetch('therapeutic_species.json').then(response=>{
   if(!response.ok)throw Error('Dataset unavailable (HTTP '+response.status+')');
   return response.json();
  }).then(data=>{
   if(!Array.isArray(data.entries))throw Error('The species dataset is invalid');
   const seen=new Set();
   entries=data.entries.filter(e=>{
    if(!e||!e.id||seen.has(e.id))return false;
    seen.add(e.id);return true;
   });
   loaded=true;render();
  }).catch(error=>{loadPromise=null;const dest=by('btiSpeciesCount');if(dest)dest.textContent='Species data could not load: '+error.message+'. Refresh and try again.'});
  await loadPromise;
 }
 function syncOpen(open){
  const section=by('btiSpeciesExplorer');
  if(!section)return;
  section.hidden=!open;
  by('btiOpenSpeciesFromText')?.setAttribute('aria-expanded',String(open));
 }
 async function open(){
  const section=by('btiSpeciesExplorer');
  if(!section)return;
  if(!section.hidden){
   syncOpen(false);
   by('btiOpenSpeciesFromText')?.focus();
   return;
  }
  syncOpen(true);
  await load();
  section.scrollIntoView({behavior:'smooth',block:'start'});
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const button=by('btiOpenSpeciesFromText');
  if(!button||!by('btiSpeciesExplorer'))return;
  button.addEventListener('click',open);
  by('btiCloseSpecies')?.addEventListener('click',()=>{syncOpen(false);button.focus();by('btiMechanismFeature')?.scrollIntoView({behavior:'smooth',block:'start'})});
  ['btiSpeciesSearch','btiSpeciesArea','btiSpeciesGram','btiSpeciesEvidence','btiSpeciesPlatform'].forEach(id=>by(id)?.addEventListener(id==='btiSpeciesSearch'?'input':'change',render));
 });
})();
