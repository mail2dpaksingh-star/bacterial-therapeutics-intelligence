/* Public-source company profiles. No local token or browser-side AI service.
   Dated evidence is loaded from ./company_dossiers.json and displayed independently
   from editable assessments stored only in this browser. */
(()=>{
'use strict';
const by=id=>document.getElementById(id);
const create=(tag,text,cls)=>{
 const node=document.createElement(tag);
 if(text!==undefined&&text!==null)node.textContent=String(text);
 if(cls)node.className=cls;
 return node;
};
const add=(to,tag,text,cls)=>{const node=create(tag,text,cls);to.appendChild(node);return node};
const link=(to,label,url)=>{
 if(typeof url!=='string'||!/^https:\/\//i.test(url))return add(to,'span',label);
 const node=add(to,'a',label);node.href=url;node.target='_blank';node.rel='noopener noreferrer';return node;
};
let catalog=null,current=null,lastReport=null;
const sourceIndex=profile=>Object.fromEntries((profile.sources||[]).map(s=>[s.id,s]));
const statusClass=status=>{
 const s=String(status||'').toLowerCase();
 if(s.includes('discontinued'))return'discontinued';
 if(s.includes('negative'))return'regulatory';
 if(s.includes('ongoing')||s.includes('clinical evaluation')||s.includes('clinical development'))return'ongoing';
 if(s.includes('preclinical')||s.includes('insufficient'))return'preclinical';
 if(s.includes('approved'))return'approved';
 return'unknown';
};
function sourceList(parent,sources){
 if(!sources.length){add(parent,'p','No separately verified public documents have been included for this category.');return}
 const list=add(parent,'ul',undefined,'company-evidence-list');
 for(const row of sources){
  const item=add(list,'li',undefined,'company-evidence-item');
  link(item,row.title,row.url);
  add(item,'div',row.kind+' · '+(row.date||'Date not specified'),'company-source-meta');
  if(row.note)add(item,'p',row.note);
 }
}
function listPrograms(parent,p,view){
 const section=add(parent,'section',undefined,'company-profile-section');
 add(section,'h5',view==='clinical'?'Clinical development and reported outcomes':'Programs and latest documented status');
 const grid=add(section,'div',undefined,'company-profile-grid');
 const index=sourceIndex(p);
 for(const program of p.programs||[]){
  const item=add(grid,'article',undefined,'company-program');
  const top=add(item,'div',undefined,'company-program-top');
  add(top,'h5',program.name);
  const pill=add(top,'span',program.status,'company-status');pill.dataset.state=statusClass(program.status);
  add(item,'p',program.indication+' · '+program.phase,'company-metadata');
  add(item,'p','Last documented: '+(program.latest_report||'Not specified'),'company-metadata');
  add(item,'p',program.outcome);
  if(program.status_reason)add(item,'p','Status basis: '+program.status_reason,'company-metadata');
  const cited=(program.source_ids||[]).map(id=>index[id]).filter(Boolean);
  if(cited.length){const foot=add(item,'div',undefined,'company-mini-links');for(const row of cited)link(foot,row.title+' ↗',row.url)}
 }
}
function explanation(parent,label,text){
 const section=add(parent,'section',undefined,'company-profile-section');
 add(section,'h5',label);
 add(section,'p',text);
}
function header(root,p,area){
 const h=add(root,'div',undefined,'company-headline');
 const left=add(h,'div');
 add(left,'h4',p.name);
 add(left,'p',p.platform);
 const tags=add(h,'div',undefined,'company-profile-tags');
 add(tags,'span',p.classification);
 for(const focus of p.focus||[])add(tags,'span',focus);
 const primary=(p.programs||[])[0];
 if(primary){
  const current=add(root,'div',undefined,'company-current-status');
  add(current,'strong','Program status · '+primary.name+' · '+primary.phase);
  const tag=add(current,'span',primary.status,'company-status');tag.dataset.state=statusClass(primary.status);
  add(current,'small','Last document: '+primary.latest_report+(p.programs.length>1?' · '+p.programs.length+' programs listed':''));
 }
 const currentArea=area||'All';
 if(currentArea!=='All'&&!(p.focus||[]).includes(currentArea)){
  add(root,'p','No documented '+currentArea.toLowerCase()+' therapeutic program is included for '+p.name+' in the current public-source snapshot. Displaying the company\'s existing programs instead.','company-program-mismatch');
 }
}
function documentSection(root,p,filter){
 const title=filter==='patents'?'Patent records and search leads':'Public source documents';
 const section=add(root,'section',undefined,'company-profile-section');
 add(section,'h5',title);
 if(filter==='patents')sourceList(section,[...(p.sources||[]).filter(x=>/patent/i.test(x.kind)),...(p.patent_links||[])]);
 else if(filter==='clinical')sourceList(section,(p.sources||[]).filter(x=>/clinical|trial|SEC|FDA|regulatory|company program|press|government|quarterly/i.test(x.kind)));
 else if(filter==='evidence')sourceList(section,(p.sources||[]).filter(x=>!/patent/i.test(x.kind)));
 else sourceList(section,p.sources||[]);
}
function render(){
 const target=by('companyDossier'),selected=by('reviewPlatform')?.value;
 if(!target||!catalog)return;
 const p=catalog.companies.find(x=>x.id===selected);
 target.replaceChildren();
 if(!p){add(target,'p','Choose a company to see its public research profile.');return}
 current=p;
 const focus=by('reviewLens')?.value||'overview',area=by('reviewArea')?.value||'All';
 header(target,p,area);
 if(focus==='overview'){
  listPrograms(target,p,'overview');
  explanation(target,'Biological mechanism',p.mechanism);
  explanation(target,'Evidence interpretation',p.clinical);
  documentSection(target,p,'clinical');
 }else if(focus==='clinical'){
  listPrograms(target,p,'clinical');
  explanation(target,'Clinical interpretation',p.clinical);
  documentSection(target,p,'clinical');
 }else if(focus==='evidence'){
  explanation(target,'Proposed biological mechanism',p.mechanism);
  explanation(target,'Scientific publications and study evidence',p.publication);
  explanation(target,'Evidence limits',p.clinical);
  documentSection(target,p,'evidence');
 }else if(focus==='patents'){
  explanation(target,'Patent and freedom-to-operate assessment scope',p.patent);
  const expl=add(target,'section',undefined,'company-profile-section');
  add(expl,'p','These entries are public disclosures and search leads, not confirmed freedom-to-operate clearances or complete patent-family analyses.');
  documentSection(target,p,'patents');
 }else if(focus==='sources'){
  documentSection(target,p,'all');
 }
 const foot=add(target,'p','Research snapshot: '+catalog.snapshot_date+'. Source document dates are shown separately. Company-reported status does not necessarily match live ClinicalTrials.gov status.','company-metadata');
 lastReport={snapshot_date:catalog.snapshot_date,method:catalog.method,selected_view:focus,selected_area:area,...p};
 const latest=by('companySearchLatest');
 if(latest)latest.href='https://clinicaltrials.gov/search?term='+encodeURIComponent(p.name+' '+(p.programs?.[0]?.name||''));
}
function insertNotes(){
 const p=current,t=by('notes');
 if(!p||!t)return;
 const focus=by('reviewLens')?.value||'overview';
 const lines=['Public research summary ('+catalog.snapshot_date+'): '+p.name,'Platform: '+p.platform];
 for(const x of p.programs||[])lines.push('Program: '+x.name+'; Status: '+x.status+'; Phase: '+x.phase+'; Latest evidence: '+x.latest_report+'.','Reported outcome: '+x.outcome);
 if(focus==='patents')lines.push('Patent context: '+p.patent);
 else if(focus==='evidence')lines.push('Scientific context: '+p.publication);
 else lines.push('Clinical context: '+p.clinical);
 for(const row of (p.sources||[]).slice(0,4))lines.push('Source ['+row.date+']: '+row.title+' — '+row.url);
 lines.push('My evaluation: ');
 const result=lines.join('\n');
 const already=t.value.trim();
 t.value=already?already+'\n\n'+result:result;
 t.focus();
 const msg=by('reviewStatus');if(msg)msg.textContent='Added a dated source summary to your editable notes. Review it before saving.';
}
function exportProfile(){
 if(!lastReport)return;
 const content=JSON.stringify(lastReport,null,2);
 const blob=new Blob([content],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='bti_company_research_'+lastReport.id+'_'+catalog.snapshot_date+'.json';
 document.body.appendChild(a);a.click();a.remove();
 setTimeout(()=>URL.revokeObjectURL(url),1200);
}
function onCompanyChange(){
 const p=catalog?.companies?.find(x=>x.id===by('reviewPlatform')?.value);
 if(p&&by('reviewArea'))by('reviewArea').value=p.focus[0]||'Oncology';
 render();
}
async function initialize(){
 const holder=by('companyDossier');
 if(!holder)return;
 try{
  const response=await fetch('company_dossiers.json',{cache:'no-store'});
  if(!response.ok)throw Error('Source-linked company data unavailable');
  const data=await response.json();
  if(!Array.isArray(data.companies)||data.companies.length===0)throw Error('Company profiles are empty');
  catalog=data;
  const menu=by('reviewPlatform');
  if(menu){
   const currentId=menu.value;
   menu.replaceChildren();
   for(const p of catalog.companies){
    const option=create('option',p.name+' — '+p.platform);option.value=p.id;menu.appendChild(option);
   }
   if(catalog.companies.some(p=>p.id===currentId))menu.value=currentId;
   menu.addEventListener('change',onCompanyChange);
  }
  by('reviewArea')?.addEventListener('change',render);
  by('reviewLens')?.addEventListener('change',render);
  by('evidence')?.addEventListener('change',()=>{
   const lens=by('reviewLens');if(lens){lens.value='evidence';render()}
  });
  by('fto')?.addEventListener('change',()=>{
   const lens=by('reviewLens');if(lens){lens.value='patents';render()}
  });
  by('companyAddNotes')?.addEventListener('click',insertNotes);
  by('companyExportDossier')?.addEventListener('click',exportProfile);
  onCompanyChange();
 }catch(error){
  holder.replaceChildren();
  add(holder,'p','The company research profiles could not load. Check the Cloudflare deployment or try refreshing the page.');
  const a=add(holder,'a','View existing company atlas');
  a.href='#btiResearchMenu';
 }
}
document.addEventListener('DOMContentLoaded',initialize);
})();
