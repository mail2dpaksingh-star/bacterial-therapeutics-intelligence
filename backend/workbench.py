"""Curated disease-to-evidence navigation. Explicitly preserves evidence tiers and provenance.

This service does NOT automatically infer clinical efficacy or grant patent FTO.
"""
import re
from urllib.parse import quote
from .knowledge import CLAIMS, SOURCES, LEVELS
from .discovery import list_records

# Maps publicly disclosed company approaches to relevant research domains. These are
# comparison leads only; a company listing is NOT evidence supporting a claim.
COMPARATORS = {
    'Oncology': [
        {'name':'Indaptus Therapeutics','approach':'Killed bacterial immune stimulant','status':'Historical/development status requires review','url':'https://www.sec.gov/edgar/search/'},
        {'name':'Actym Therapeutics','approach':'Investigational engineered bacterial delivery','status':'Investigational','url':'https://clinicaltrials.gov/search?term=Actym'},
        {'name':'Prokarium','approach':'Investigational microbial immunotherapy','status':'Investigational','url':'https://clinicaltrials.gov/search?term=Prokarium'},
        {'name':'Enterome','approach':'Microbiome-derived antigen immunotherapy','status':'Investigational','url':'https://clinicaltrials.gov/search?term=Enterome'}
    ],
    'Cardiometabolic': [
        {'name':'Microbial metabolite research','approach':'SCFA, bile acid, TMAO and host metabolism','status':'Research pathway, not an approved microbial treatment','url':'https://pubmed.ncbi.nlm.nih.gov/?term=microbiome+cardiometabolic+intervention'}
    ],
    'Microbiome': [
        {'name':'Vedanta Biosciences','approach':'Defined microbial communities','status':'Development status requires verification','url':'https://clinicaltrials.gov/search?term=VE303'},
        {'name':'MaaT Pharma','approach':'Microbiome ecosystem therapeutics','status':'Regulatory status requires verification','url':'https://clinicaltrials.gov/search?term=MaaT+Pharma'}
    ]
}

STOP={'the','with','this','that','from','and','for','into','have','therapy','microbiome','disease','treatment','study','patient','patients','clinical','cancer','bacterial','microbial'}
def tokens(text):
    return {v for v in re.findall(r'[a-z0-9]+',text.lower()) if len(v)>3 and v not in STOP}

def display_claim(c):
    result=dict(c)
    result['evidence_label']=LEVELS.get(c['grade'],c['grade'].replace('_',' '))
    result['curated_sources']=[{'id':sid,**SOURCES[sid]} for sid in c['sources'] if sid in SOURCES]
    result['has_verifying_source']=bool(result['curated_sources'])
    return result

def overview():
    return {'areas':['All','Oncology','Cardiometabolic','Microbiome'],
            'claims':[display_claim(c) for c in CLAIMS],
            'counts':{'curated_claims':len(CLAIMS),'curated_source_records':len(SOURCES)},
            'disclaimer':'Curated pathway claims are not proof of complete mechanisms. Title-matched discovery records are leads, not verifying evidence. Regulatory indications are product/indication-specific.'}

def detail(claim_id):
    c=next((r for r in CLAIMS if r['id']==claim_id),None)
    if c is None:return None
    claim=display_claim(c)
    db=list_records(c['area'],limit=250)
    terms=tokens(c['disease']+' '+c['intervention']+' '+c['title'])
    matches=[]
    for rec in db['records']:
        hit=sorted(terms & tokens(rec['title']))
        if not hit:continue
        matches.append({'id':rec['id'],'kind':rec['kind'],'title':rec['title'],'url':rec['url'],'published':rec['published'],'matching_terms':hit,'match_basis':'title_keyword_overlap_only','retrieved_at':rec['retrieved_at']})
    matches.sort(key=lambda r:(-len(r['matching_terms']),r['title']))
    pat_query='"'+c['intervention']+'" '+c['disease']
    patents={'label':'Search published patent documents (unreviewed)',
             'url':'https://patents.google.com/xhr/query?url='+quote('q='+pat_query),
             'alternate_url':'https://patents.google.com/?q='+quote(pat_query),
             'status':'Search lead only. Claim scope, ownership, jurisdictions, legal status and FTO not checked.'}
    return {'claim':claim,'pathway':[
        {'id':'therapy','kind':'Intervention','label':c['intervention'],'description':'Therapeutic intervention or observational exposure. This node does not assert effectiveness.'},
        {'id':'molecular','kind':'Mechanism','label':c['mechanism'],'description':'Mechanistic assertion at the evidence tier shown. May be partial or hypothetical.'},
        {'id':'marker','kind':'Biomarker','label':c['biomarker'],'description':'Research or exploratory biomarker; clinical validity is not implied.'},
        {'id':'outcome','kind':'Clinical interpretation','label':c['outcome'],'description':'Scope-limited interpretation based on curated evidence.'}],
        'curated_sources':claim['curated_sources'],
        'discovery_leads':matches[:12],
        'discovery_total_matching':len(matches),
        'comparators':COMPARATORS.get(c['area'],[]),
        'patent_lead':patents,
        'limitations':c['limitations'],
        'warnings':['Molecular sequence arrows illustrate a conceptual association, not a validated causal chain.',
                    'Discovery links match publication/trial titles only and do not verify the pathway.',
                    'Patent search results are unreviewed leads; no novelty or FTO conclusion.'],
        'data_status':{'curated_source_count':len(claim['curated_sources']),'saved_discovery_records':db['total'],'discovery_truncated':db['total']>250}}
