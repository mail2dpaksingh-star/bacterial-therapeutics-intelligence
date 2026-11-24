/* Bacterial Therapeutics Intelligence public community idea feed.
   Public posts reside in GitHub Issues, not in a local browser database.
   Reading requires no website token. Publishing requires GitHub sign-in. */
(()=>{
'use strict';
const repo='mail2dpaksingh-star/bacterial-therapeutics-intelligence';
const github='https://github.com/'+repo;
const by=id=>document.getElementById(id);
const topicNames=['All','Oncology','Cardiometabolic','Microbiome','Bacterial engineering','Delivery & formulation','Other'];
let allIdeas=[],pending=false;
const make=(tag,cls,txt)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(txt!==undefined)n.textContent=String(txt);return n};
function addLink(parent,label,url,cls){const a=make('a',cls,label);a.href=url;a.target='_blank';a.rel='noopener noreferrer';parent.appendChild(a);return a}
function normalizedTopic(body){const match=String(body||'').match(/(?:^|\n)##?\s*(?:Research\s+category|Category|Topic)\s*\n+([^\n]+)/i);const found=match?match[1].trim():'Other';return topicNames.find(t=>t!=='All'&&found.toLowerCase().includes(t.toLowerCase()))||'Other'}
function snippet(body){return String(body||'').replace(/^---[\s\S]*?---\s*/,'').replace(/(?:^|\n)#{1,5}\s+/g,' ').replace(/\[[^\]]+\]\([^)]*\)/g,'source link').replace(/[\u0000-\u001f]+/g,' ').replace(/\s{2,}/g,' ').slice(0,340).trim()||'Open this discussion to read the research idea.'}
function render(){
 const feed=by('blogFeed');if(!feed)return;
 const area=by('blogTopicFilter')?.value||'All',search=(by('blogSearch')?.value||'').trim().toLowerCase();
 const results=allIdeas.filter(item=>(area==='All'||item.category===area)&&(!search||(item.title+' '+item.excerpt+' '+item.category).toLowerCase().includes(search)));
 feed.replaceChildren();
 const summary=by('blogFeedCount');if(summary)summary.textContent=allIdeas.length?results.length+' of '+allIdeas.length+' community ideas':'Community conversations';
 if(!allIdeas.length){const empty=make('div','blog-empty');empty.append(make('h3','', 'Start the first community discussion'),make('p','', 'No published community ideas have been found yet. Use “Share an idea” to start a public conversation on GitHub.'));feed.append(empty);return}
 if(!results.length){feed.append(make('p','blog-empty','No ideas match this filter. Try another topic or search.'));return}
 for(const item of results){
  const art=make('article','blog-post'),meta=make('div','blog-post-meta');
  meta.append(make('span','blog-topic-chip',item.category),make('span','',item.date),make('span','', 'by '+item.author));
  const title=make('h3','',item.title);
  const excerpt=make('p','',item.excerpt);
  const foot=make('div','blog-post-footer');
  foot.append(make('span','',item.comments+' comment'+(item.comments===1?'':'s')));
  addLink(foot,'Read & discuss ↗',item.url,'blog-post-link');
  art.append(meta,title,excerpt,foot);feed.append(art);
 }
}
async function loadIdeas(){
 const status=by('blogFeedStatus');if(pending)return;pending=true;
 if(status)status.textContent='Loading public ideas…';
 try{
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8500);
  let response;
  try{response=await fetch('https://api.github.com/repos/'+repo+'/issues?state=all&sort=created&direction=desc&per_page=100',{headers:{Accept:'application/vnd.github+json'},signal:controller.signal,cache:'no-store'})}
  finally{clearTimeout(timer)}
  if(!response.ok)throw Error('Unable to load the public idea feed');
  const data=await response.json();if(!Array.isArray(data))throw Error('Unexpected feed format');
  allIdeas=data.filter(x=>!x.pull_request&&typeof x.title==='string'&&/^\[Idea\]\s+/i.test(x.title)&&typeof x.html_url==='string'&&x.html_url.startsWith(github+'/issues/')).slice(0,40)
  .map(x=>({title:x.title.replace(/^\[Idea\]\s*/i,''),category:normalizedTopic(x.body),excerpt:snippet(x.body),date:new Date(x.created_at).toLocaleDateString(undefined,{year:'numeric',month:'short',day:'numeric'}),comments:Number(x.comments)||0,author:x.user?.login||'Community contributor',url:x.html_url}));
  if(status)status.textContent='Showing public community conversations hosted on GitHub.';
  render();
 }catch(e){
  allIdeas=[];render();
  if(status){status.replaceChildren(make('span','', 'The public feed could not be loaded right now. '));addLink(status,'Browse ideas on GitHub ↗',github+'/issues?q='+encodeURIComponent('is:issue [Idea]'),'blog-inline-link')}
 }finally{pending=false}
}
function publish(event){
 event.preventDefault();
 const topic=by('blogIdeaTopic')?.value||'Other',title=(by('blogIdeaTitle')?.value||'').trim().slice(0,110),idea=(by('blogIdeaBody')?.value||'').trim().slice(0,1500),sources=(by('blogIdeaSources')?.value||'').trim().slice(0,500),status=by('blogPublishStatus');
 if(title.length<8||idea.length<30){if(status)status.textContent='Add a descriptive title (8+ characters) and idea (30+ characters).';return}
 const body='## Research category\n'+topic+'\n\n## Your idea or hypothesis\n'+idea+'\n\n## Supporting evidence (optional)\n'+(sources||'Not supplied')+'\n\n## Questions for the community\nWhat evidence, alternative mechanisms, or scientific limitations should be considered?\n\n---\nPublic conceptual discussion only; not a verified scientific finding, clinical recommendation, or freedom-to-operate conclusion.';
 const url=github+'/issues/new?'+new URLSearchParams({template:'community_idea.md',title:'[Idea] '+title,body}).toString();
 if(status)status.textContent='Opening GitHub to review and publish. A free GitHub sign-in is required; no BTI access token is needed.';
 window.open(url,'_blank','noopener,noreferrer');
}
document.addEventListener('DOMContentLoaded',()=>{
 if(!by('tab-community'))return;
 by('blogShareForm')?.addEventListener('submit',publish);
 by('blogTopicFilter')?.addEventListener('change',render);
 by('blogSearch')?.addEventListener('input',render);
 by('blogRefresh')?.addEventListener('click',loadIdeas);
 document.querySelectorAll('[data-blog-prompt]').forEach(btn=>btn.addEventListener('click',()=>{
  if(by('blogIdeaTopic'))by('blogIdeaTopic').value=btn.getAttribute('data-blog-topic')||'Other';
  if(by('blogIdeaTitle'))by('blogIdeaTitle').value=btn.getAttribute('data-blog-prompt')||'';
  by('blogIdeaBody')?.focus();
  by('blogShareForm')?.scrollIntoView({behavior:'smooth',block:'center'});
 }));
 loadIdeas();
});
})();
