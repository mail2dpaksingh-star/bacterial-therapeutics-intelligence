"""Persistent discovery index. Source metadata only; no inferred efficacy or automatic FTO."""
import asyncio
import json
import os
import re
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal
import httpx
from pydantic import BaseModel, Field
from .engine import retrieve_pubmed, retrieve_trials

DB_PATH=Path(os.getenv('BTI_DB_PATH',str(Path(__file__).resolve().parent.parent/'data'/'discovery.sqlite3')))
TOPICS={
 'Oncology': {'query':'(cancer immunotherapy) AND (bacterial OR microbiome OR BCG OR microbial)', 'tags':['cancer','melanoma','tumor','immunotherapy','checkpoint','PD-1','BCG','bladder','solid tumor','neoplasm']},
 'Cardiometabolic': {'query':'(diabetes OR obesity OR atherosclerosis OR metabolic syndrome) AND (gut microbiome OR microbial metabolites OR bacteria)', 'tags':['diabetes','obesity','metformin','insulin resistance','atherosclerosis','cardiovascular','TMAO','short-chain fatty acid','MASLD','metabolic']},
 'Microbiome': {'query':'(microbiota therapeutics OR bacterial consortium OR microbiome restoration) AND (clinical trial OR intervention)', 'tags':['microbiota','microbiome','Clostridioides difficile','C. difficile','consortium','colonization resistance','FMT','engraftment']},
}
class DiscoveryQuery(BaseModel):
    area:Literal['Oncology','Cardiometabolic','Microbiome']='Oncology'
    max_publications:int=Field(default=12,ge=1,le=30)
    max_trials:int=Field(default=8,ge=1,le=20)


def connect():
    DB_PATH.parent.mkdir(parents=True,exist_ok=True)
    db=sqlite3.connect(DB_PATH,timeout=10)
    db.row_factory=sqlite3.Row
    db.execute("""CREATE TABLE IF NOT EXISTS records (
       id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, area TEXT NOT NULL,
       url TEXT NOT NULL, published TEXT NOT NULL, retrieved_at TEXT NOT NULL,
       payload TEXT NOT NULL, mapping TEXT NOT NULL, mapping_basis TEXT NOT NULL)""")
    db.execute('CREATE INDEX IF NOT EXISTS idx_records_area ON records(area)')
    db.commit();return db

def classify_metadata(title, area):
    """Discovery-only keyword co-occurrences, NOT verified causal biology."""
    t=title.lower()
    matching=[term for term in TOPICS[area]['tags'] if term.lower() in t]
    return matching[:8]

def save_records(area,records):
    timestamp=datetime.now(timezone.utc).isoformat()
    db=connect()
    with db:
        for r in records:
            if not r.get('id') or not r.get('title') or not r.get('url'):continue
            labels=classify_metadata(r['title'],area)
            db.execute("""INSERT INTO records(id,kind,title,area,url,published,retrieved_at,payload,mapping,mapping_basis)
            VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET
            title=excluded.title,kind=excluded.kind,url=excluded.url,published=excluded.published,
            retrieved_at=excluded.retrieved_at,payload=excluded.payload,mapping=excluded.mapping,mapping_basis=excluded.mapping_basis""",
            (area+'|'+r['id'],r['kind'],r['title'],area,r['url'],r.get('published','') or r.get('status',''),timestamp,
             json.dumps(r,ensure_ascii=False),json.dumps(labels), 'keyword_cooccurrence_only'))
    db.close()
    return timestamp

def list_records(area='All',q='',limit=100,offset=0):
    db=connect();where=[];args=[]
    if area!='All':where.append('area=?');args.append(area)
    if q:where.append('(title LIKE ? OR mapping LIKE ? OR id LIKE ?)');args.extend(['%'+q+'%']*3)
    w=' WHERE '+' AND '.join(where) if where else ''
    total=db.execute('SELECT count(*) FROM records'+w,args).fetchone()[0]
    rows=db.execute('SELECT * FROM records'+w+' ORDER BY retrieved_at DESC,id LIMIT ? OFFSET ?',args+[limit,offset]).fetchall()
    db.close();items=[]
    for row in rows:
        r=dict(row);r['mapping']=json.loads(r['mapping']);r['payload']=json.loads(r['payload']);items.append(r)
    return {'total':total,'records':items,'method':'title keyword co-occurrence (not causal evidence)','persistent':True}

def graph(area='All'):
    data=list_records(area,limit=500)
    nodes={}; edges=[]
    for r in data['records']:
        src=r['id'];nodes[src]={'id':src,'label':r['title'],'kind':r['kind'],'url':r['url']}
        disease='area:'+r['area'];nodes[disease]={'id':disease,'label':r['area'],'kind':'research_domain'}
        edges.append({'source':src,'target':disease,'relation':'retrieved_in_domain','basis':'search_query'})
        for t in r['mapping']:
            tid='keyword:'+t.lower();nodes[tid]={'id':tid,'label':t,'kind':'title_keyword'}
            edges.append({'source':src,'target':tid,'relation':'title_mentions','basis':'lexical_not_verified'})
    return {'nodes':list(nodes.values()),'edges':edges,'records':len(data['records']),'truncated':data['total']>500,'note':'Discovery graph only. Keyword connections must NOT be interpreted as mechanistic, causal, therapeutic, clinical, or patent claims.'}

async def discover(area,max_publications=12,max_trials=8):
    query=TOPICS[area]['query']
    # Fixed scientific topic queries prevent arbitrary URL or prompt-controlled network endpoints.
    async with httpx.AsyncClient(timeout=18,headers={'User-Agent':'BTI-Research/1.3 (metadata discovery)'}) as client:
        pubs, pub_err=await retrieve_pubmed(client,query,max_publications)
        # Trial query intentionally simpler than PubMed's boolean expression.
        trial_terms={'Oncology':'bacterial immunotherapy cancer','Cardiometabolic':'microbiome diabetes','Microbiome':'microbiota therapeutic'}
        trials,tr_err=await retrieve_trials(client,trial_terms[area],max_trials)
    records=pubs+trials
    stamp=save_records(area,records) if records else None
    return {'area':area,'newly_retrieved':len(records),'stored_total':list_records(area,limit=1)['total'],'retrieved_at':stamp,'warnings':[x for x in [pub_err,tr_err] if x], 'source_methods':['NCBI ESearch + ESummary','ClinicalTrials.gov v2'],'limitations':'Search metadata and registry records; title keyword links are not evidence of causation, treatment efficacy, approval, or patent clearance.'}
