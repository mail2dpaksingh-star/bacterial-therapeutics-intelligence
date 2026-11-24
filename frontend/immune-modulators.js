/* Public, source-linked TLR/IFN pathway comparison. No accounts or tokens. */
(()=>{'use strict';
const find=id=>document.getElementById(id);
const node=(tag,text,className)=>{const x=document.createElement(tag);if(text!=null)x.textContent=String(text);if(className)x.className=className;return x;};
let all=[],selected=null;
const companyLabels={isa_pharma:'ISA Pharmaceuticals',indaptus:'Indaptus Therapeutics',oncovir:'Oncovir — Hiltonol',highlight:'Highlight — BO-112',aimimmunotech:'AIM ImmunoTech — Ampligen',gsk_mpl:'GSK — MPL/AS01',gilead_tlr7:'Gilead — Vesatolimod',sanofi_dynavax:'Sanofi — CpG 1018',pharmaand_ifna:'pharmaand — IFN-alpha',biogen_ifnb:'Biogen — IFN-beta',amgen_ifng:'Amgen — IFN-gamma'};
const classType=x=>x.group==="Interferon signaling"?"Interferons":"TLR agonists";
function openCompany(id){
 const nav=find('workspaceSelect'),company=find('reviewPlatform'),filter=find('reviewPreclinicalOnly'),lens=find('reviewLens');
 if(filter?.checked){filter.checked=false;filter.dispatchEvent(new Event('change',{bubbles:true}));}
 if(nav){nav.value='review';nav.dispatchEvent(new Event('change',{bubbles:true}));}
 if(company&&[...company.options].some(o=>o.value===id)){company.value=id;company.dispatchEvent(new Event('change',{bubbles:true}));}
 if(lens){lens.value='safety';lens.dispatchEvent(new Event('change',{bubbles:true}));}
 find('companyIntelHeading')?.scrollIntoView({behavior:'smooth',block:'start'});
}
function detail(x){
 const target=find('immunePathwayDetails');if(!target)return;target.replaceChildren();
 if(!x){target.append(node('p','No matching pathway. Clear your search or select a different category.'));return}
 const tag=node('span',classType(x),'immune-category');target.append(tag);
 target.append(node('h3',x.key+' — '+x.ligand));
 const fields=[['Natural bacterial relationship',x.natural],['Engineered bacterial platform',x.engineered],['Engineering evidence level',x.engineer_level],['Synthetic / recombinant comparators',x.synthetic],['Host signaling',x.signal],['Clinical safety considerations',x.safety]];
 for(const [name,value] of fields){const box=node('div',null,'immune-fact');box.append(node('strong',name),node('p',value));target.append(box)}
 const c=node('div',null,'immune-company');
 c.append(node('strong','Open company portfolio and adverse-event findings'));
 for(const id of x.companies||[]){const button=node('button',companyLabels[id]||id.replace(/_/g,' '),'immune-company-button');button.type='button';button.dataset.company=id;button.addEventListener('click',()=>openCompany(id));c.append(button);}
 target.append(c);
 const refs=node('div',null,'immune-sources');refs.append(node('strong','Primary sources'));
 for(const source of x.sources||[]){if(!/^https:\/\//.test(source.url))continue;const a=node('a',source.label+' ↗');a.href=source.url;a.target='_blank';a.rel='noopener noreferrer';refs.append(a)}
 target.append(refs);
}
function render(){
 const term=(find('immunePathSearch')?.value||'').trim().toLowerCase(),group=find('immunePathGroup')?.value||'all',dest=find('immunePathList'),count=find('immunePathCount');if(!dest)return;
 const records=all.filter(e=>(group==='all'||e.group===group)&&(!term||[e.key,e.ligand,e.natural,e.engineered,e.synthetic,e.signal,...e.companies].join(' ').toLowerCase().includes(term)));
 if(!records.some(e=>e.key===selected))selected=records[0]?.key||null;
 dest.replaceChildren();
 for(const e of records){
  const button=node('button',null,'immune-path-button');button.type='button';
  button.setAttribute('aria-pressed',String(e.key===selected));
  button.append(node('strong',e.key),node('small',classType(e)));
  button.addEventListener('click',()=>{selected=e.key;render()});
  dest.append(button);
 }
 if(!records.length)dest.append(node('p','No matching immune pathways.'));
 if(count)count.textContent=records.length+' of '+all.length+' pathways';
 detail(records.find(e=>e.key===selected));
}
document.addEventListener('DOMContentLoaded',async()=>{
 if(!find('immunePathwayDetails'))return;
 const disclosure=find('immuneModulators');
 const openFromLink=()=>{if(disclosure)disclosure.open=true;};
 document.querySelectorAll('a[href="#immuneModulators"]').forEach(link=>link.addEventListener('click',openFromLink));
 const syncDeepLink=()=>{if(window.location.hash==='#immuneModulators')openFromLink();};
 window.addEventListener('hashchange',syncDeepLink);
 syncDeepLink();
 try{
 const response=await fetch('immune_modulator_pathways.json',{cache:'no-store'});
 if(!response.ok)throw Error('HTTP '+response.status);
 const data=await response.json();if(!Array.isArray(data.entries))throw Error('Invalid pathway data');
 all=data.entries;
 find('immunePathSearch')?.addEventListener('input',render);
 find('immunePathGroup')?.addEventListener('change',render);
 render();
 }catch(error){find('immunePathwayDetails').textContent='The pathway library could not load. Please try refreshing this page.';}
});
})();