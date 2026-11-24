/* Question-first scientific evidence explorer for static Cloudflare hosting.
   Explanations use documented curated literature; live search yields metadata only.
   This does NOT present rule-based matching as a generative AI response. */
(()=>{
'use strict';
const by=id=>document.getElementById(id);
const topics=[
 {
  id:'scfa', title:'Short-chain fatty acids and inflammatory signaling',
  triggers:['butyrate','propionate','acetate','scfa','short chain fatty','short-chain fatty'],
  tags:['microbial metabolite','bacterial metabolite','gut metabolite','anti inflammatory','reduce inflammation','inflammation'],
  summary:'Yes. Butyrate, propionate and acetate are gut-microbial short-chain fatty acids with documented immunomodulatory effects. Butyrate is particularly well studied for effects on intestinal epithelial integrity and immune-cell responses.',
  mechanisms:['Butyrate can influence immune-cell differentiation and gene regulation through histone deacetylase-related pathways and SCFA-responsive receptors.','Effects vary with tissue, local concentration, cell type and inflammatory context; anti-inflammatory activity is not universal.'],
  interpretation:'Evidence spans mechanistic, experimental and some clinical studies. It does not establish that every SCFA-based intervention improves a particular patient outcome.',
  articles:[
   {title:'Short-chain fatty acids: linking diet, the microbiome and immunity',year:'2024',kind:'Peer-reviewed review',url:'https://pubmed.ncbi.nlm.nih.gov/38565643/'},
   {title:'Therapeutic and Immunologic Effects of Short-Chain Fatty Acids in Inflammatory Bowel Disease: A Systematic Review',year:'2024',kind:'Systematic review',url:'https://pubmed.ncbi.nlm.nih.gov/39456661/'},
   {title:'Butyrate and propionate can activate NLRP3 in stimulated human macrophages',year:'2024',kind:'Primary mechanistic research; counterpoint',url:'https://pubmed.ncbi.nlm.nih.gov/39277863/'}
  ]
 },
 {
  id:'indole',title:'Tryptophan-derived indole metabolites and gut immunity',
  triggers:['tryptophan','indole','indole-3','ahr','aryl hydrocarbon','intestinal barrier'],
  tags:['microbial metabolite','bacterial metabolite','gut metabolite','anti inflammatory','reduce inflammation','inflammation','gut'],
  summary:'Certain bacterial tryptophan metabolites, including indole derivatives, can modulate AhR-related signaling and epithelial barrier functions in experimental systems.',
  mechanisms:['Some tryptophan catabolites affect aryl hydrocarbon receptor (AhR) signaling in intestinal epithelial and immune cells.','Metabolite-specific effects differ: not all indoles are anti-inflammatory and outcomes cannot be generalized across tissues.'],
  interpretation:'This is an active research area. Experimental effects and reviews support potential pathways, not an established treatment across inflammatory diseases.',
  articles:[
   {title:'Microbial tryptophan metabolites regulate gut barrier function via the aryl hydrocarbon receptor',year:'2020',kind:'Primary preclinical research',url:'https://pubmed.ncbi.nlm.nih.gov/32719140/'},
   {title:'Microbial tryptophan catabolites in health and disease',year:'2018',kind:'Peer-reviewed review',url:'https://pubmed.ncbi.nlm.nih.gov/30120222/'}
  ]
 },
 {
  id:'tmao',title:'TMAO and cardiovascular risk: a different question',
  triggers:['tmao','trimethylamine','atherosclerosis','cardiovascular'],
  tags:['heart disease','cardiac','microbiome cardiovascular'],
  summary:'TMAO is primarily discussed in research as a diet–microbiome–host metabolite associated with cardiovascular and renal outcomes. It is not a proven anti-inflammatory bacterial therapeutic.',
  mechanisms:['Dietary substrates can be metabolized to trimethylamine by microbes; the host converts it to TMAO.','Circulating concentrations reflect several factors, including kidney function, diet and host metabolism.'],
  interpretation:'Epidemiologic associations do not establish that manipulating TMAO improves cardiovascular outcomes. Keep TMAO separate from questions about anti-inflammatory SCFAs.',
  articles:[
   {title:'Gut Microbiota-Derived TMAO: A Causal Factor Promoting Atherosclerotic Cardiovascular Disease?',year:'2023',kind:'Peer-reviewed review',url:'https://pubmed.ncbi.nlm.nih.gov/36768264/'},
   {title:'Evidence of a causal and modifiable relationship between kidney function and circulating TMAO',year:'2023',kind:'Human genetics and preclinical analysis',url:'https://pubmed.ncbi.nlm.nih.gov/37730687/'},
   {title:'Circulating TMAO and cardiovascular, cerebral and renal diseases: an umbrella review',year:'2025',kind:'Umbrella review',url:'https://pubmed.ncbi.nlm.nih.gov/40118729/'}
  ]
 },
 {
  id:'bile',title:'Bacterial bile-acid transformations and inflammatory signaling',
  triggers:['bile acid','fxr','tgr5','secondary bile'],
  tags:['gut microbiome','metabolite inflammation'],
  summary:'Gut microbial transformations change the bile-acid pool and can influence host receptor signaling, including FXR and TGR5 pathways relevant to metabolism and inflammation.',
  mechanisms:['Host and microbial metabolism jointly shape the available bile-acid species.','Different bile acids activate distinct pathways; beneficial and harmful effects cannot be summarized as one outcome.'],
  interpretation:'Clinical effects of a specific bacterial therapy must be tested separately; receptor activity or metabolomic association is not proof of patient benefit.',
  articles:[
   {title:'Impact of Bacterial Metabolites on Gut Barrier Function and Host Immunity',year:'2021',kind:'Peer-reviewed review',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC8187770/'}
  ]
 },
 {
  id:'bcg',title:'Bacterial immunotherapy and tumor immune mechanisms',
  triggers:['bcg','bladder cancer','bacterial immunotherapy','bacterial cancer','tumor microenvironment','bacterial oncology'],
  tags:['immunotherapy','tumor immune','cancer','oncology'],
  summary:'Intravesical BCG is an established bacterial immunotherapy in specified non-muscle-invasive bladder cancer settings. Engineered or systemic bacterial cancer therapies remain program- and indication-specific research areas.',
  mechanisms:['Local immune sensing and cytokine signaling contribute to the antitumor response after intravesical BCG.','Findings from BCG cannot automatically be extrapolated to other bacterial platforms or cancers.'],
  interpretation:'Clinical indication and treatment status must be checked against current regulatory information. Proposed mechanisms should be distinguished from demonstrated clinical benefit.',
  articles:[
   {title:'FDA: durvalumab plus BCG for BCG-naïve high-risk non-muscle-invasive bladder cancer',year:'2026',kind:'Regulatory information',url:'https://www.fda.gov/drugs/cancer-approvals/fda-approves-durvalumab-combination-bacillus-calmette-guerin-high-risk-non-muscle-invasive-bladder'},
   {title:'BCG with or without immune checkpoint blockade: a systematic review',year:'2026',kind:'Systematic review',url:'https://pubmed.ncbi.nlm.nih.gov/42556596/'}
  ]
 }
];
const concepts=[
 {label:'Microbial metabolites that regulate inflammation',value:'Which bacterial metabolites have evidence of anti-inflammatory activity?'},
 {label:'SCFA mechanisms',value:'How does butyrate influence inflammation and intestinal barrier function?'},
 {label:'Bacterial cancer therapy',value:'What evidence supports bacterial immunotherapy in bladder cancer?'}
];
const word=q=>String(q).toLowerCase().replace(/[\u2010-\u2015]/g,'-').replace(/[^a-z0-9\-]+/g,' ').trim();
const includes=(q,t)=>word(q).includes(word(t));
const append=(parent,tag,text,cls)=>{const node=document.createElement(tag);if(cls)node.className=cls;if(text!==undefined)node.textContent=text;parent.appendChild(node);return node};
const link=(parent,label,url,cls)=>{
 const a=append(parent,'a',label,cls);a.href=url;a.target='_blank';a.rel='noopener noreferrer';return a;
};
const related=q=>{
 const all=q.toLowerCase();
 const isMetabolite=/metabolit|butyrat|propionat|acetat|scfa|indole|tryptophan|bile acid/.test(all);
 const isInflam=/inflam|cytokin|immune|colitis|barrier|ibd/.test(all);
 const scoring=topics.map(topic=>{
  let hits=0;for(const t of topic.triggers)if(includes(q,t))hits+=5;
  if(topic.id==='scfa'&&isMetabolite&&isInflam)hits+=9;
  if(topic.id==='indole'&&isMetabolite&&isInflam)hits+=7;
  if(topic.id==='bile'&&/bile/.test(all))hits+=8;
  if(topic.id==='tmao'&&/tmao|trimethylamin/.test(all))hits+=16;
  if(topic.id==='bcg'&&/cancer|tumou?r|bcg|bladder/.test(all))hits+=8;
  return {...topic,score:hits};
 });
 // Do not mix unrelated selected claims into a free-text answer.
 return scoring.filter(t=>t.score>=5).sort((a,b)=>b.score-a.score).slice(0,3);
};
const searchTerms=q=>q.replace(/[?!,.]/g,'').slice(0,180);
function renderSource(box,source){
 const row=append(box,'li',undefined,'ask-source');
 link(row,source.title,source.url,'ask-source-link');
 append(row,'div',source.kind+' · '+source.year,'ask-source-info');
}
function renderTopic(out,topic,index){
 const card=append(out,'article',undefined,'ask-topic');
 append(card,'div',index===0?'MOST RELEVANT CURATED TOPIC':'RELATED CURATED TOPIC','ask-topic-kicker');
 append(card,'h4',topic.title);
 append(card,'p',topic.summary);
 const details=append(card,'details',undefined,'ask-topic-details');
 append(details,'summary','Mechanisms and evidence limits');
 const explanation=append(details,'div',undefined,'ask-mechanisms');
 topic.mechanisms.forEach(m=>append(explanation,'p',m));
 append(explanation,'strong','Interpretation');
 append(explanation,'p',topic.interpretation);
 const sources=append(card,'div',undefined,'ask-references');
 append(sources,'h5','Relevant literature (curated)');
 const ul=append(sources,'ul');
 topic.articles.forEach(x=>renderSource(ul,x));
}
function currentContext(out,claimId,q){
 if(!claimId)return;
 const note=append(out,'p',undefined,'ask-context');
 note.textContent='The separately selected claim above is a reference record. Your typed question was analyzed independently; it was not forced into that claim.';
}
async function liveSearch(q,out,report){
 const container=append(out,'section',undefined,'ask-discovery');
 append(container,'h4','Additional literature matches');
 const message=append(container,'p','Searching Europe PMC publication metadata…','ask-discovery-status');
 const direct=append(container,'div',undefined,'ask-external-links');
 const pubmed='https://pubmed.ncbi.nlm.nih.gov/?term='+encodeURIComponent(searchTerms(q));
 const europe='https://europepmc.org/search?query='+encodeURIComponent(searchTerms(q));
 link(direct,'Search PubMed ↗',pubmed);
 link(direct,'Search Europe PMC ↗',europe);
 const controller=new AbortController();
 const tm=setTimeout(()=>controller.abort(),8500);
 try{
  const u='https://www.ebi.ac.uk/europepmc/webservices/rest/search?'+new URLSearchParams({query:searchTerms(q),format:'json',pageSize:'6',resultType:'lite'});
  const response=await fetch(u,{signal:controller.signal});
  if(!response.ok)throw Error('Publication search unavailable');
  const payload=await response.json();
  const records=Array.isArray(payload.resultList?.result)?payload.resultList.result:[];
  report.live_search={source:'Europe PMC',records:records.length,query:searchTerms(q)};
  if(records.length===0){message.textContent='No publications returned for this exact search; broaden the terms or try the links above.';return}
  message.textContent=records.length+' publication metadata records found. These have not been individually evaluated for relevance, reliability, or causal evidence.';
  const ul=append(container,'ul',undefined,'ask-publications');
  records.forEach(record=>{
   const li=append(ul,'li');
   const pmid=String(record.pmid||'');
   const uri=/^\d+$/.test(pmid)?'https://pubmed.ncbi.nlm.nih.gov/'+pmid+'/':'https://europepmc.org/articles/'+encodeURIComponent(record.source||'MED')+'/'+encodeURIComponent(record.id||'');
   link(li,String(record.title||'Open article record'),uri);
   append(li,'small',[record.journalTitle||'',record.firstPublicationDate||record.pubYear||''].filter(Boolean).join(' · '));
  });
 }catch(error){message.textContent='Live publication search is unavailable in this browser. The curated references above and the direct search links remain available.'}
 finally{clearTimeout(tm)}
}
window.btiAskScientificQuestion=async function({query,area,claimId,setReport}={}){
 const out=by('graphResults');if(!out)return;
 const q=String(query||'').trim();
 out.replaceChildren();
 if(q.length<6){append(out,'p','Enter a scientific question of at least 6 characters.');return}
 append(out,'div','YOUR QUESTION','ask-result-kicker');
 append(out,'h3',q,'ask-question');
 const hits=related(q);
 const report={question:q,method:'Static curated topic matching plus optional Europe PMC metadata search',date:new Date().toISOString(),claim_filter_applied:false,matched_topics:hits.map(x=>x.id),publication_search_status:'pending'};
 if(hits.length){
  const ans=append(out,'div',undefined,'ask-answer');
  append(ans,'strong','What the curated evidence suggests');
  append(ans,'p',hits[0].summary);
  if(hits.length>1)append(ans,'p','Other relevant research directions: '+hits.slice(1).map(x=>x.title).join('; ')+'.');
  append(ans,'small','Evidence synthesis from a limited curated reference library; not an AI-generated systematic literature review or a clinical efficacy claim.');
  hits.forEach((topic,i)=>renderTopic(out,topic,i));
 }else{
  const missing=append(out,'div',undefined,'ask-no-match');
  append(missing,'h4','No prepared scientific answer for this exact question');
  append(missing,'p','The local literature library does not yet contain a verified synthesis for these terms. Use the publication search below to investigate; a general-purpose AI research answer would require a securely hosted model and evidence-retrieval service.');
 }
 currentContext(out,claimId,q);
 if(typeof setReport==='function')setReport(report);
 await liveSearch(q,out,report);
 report.publication_search_status='completed_or_fallback';
 if(typeof setReport==='function')setReport(report);
};
document.addEventListener('DOMContentLoaded',()=>{
 const input=by('graphQuery'),button=by('graphCheck');if(!input||!button)return;
 input.placeholder='Ask a research question, e.g., Which microbial metabolites influence inflammation?';
 input.setAttribute('aria-label','Ask a scientific research question');
 input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();button.click()}});
 const shortcuts=by('btiQuestionExamples');
 if(shortcuts){concepts.forEach(c=>{const chip=append(shortcuts,'button',c.label,'ask-example');chip.type='button';chip.addEventListener('click',()=>{input.value=c.value;button.click()})})}
});
})();
