"""BTI backend. Same-origin frontend, bearer auth, rate limit, bounded external calls."""
import asyncio
import os
import secrets
import time
from collections import defaultdict, deque
from datetime import datetime, timezone
from pathlib import Path
from typing import Literal

from fastapi import Depends, FastAPI, Header, HTTPException, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from .engine import AREAS, fetch_evidence, run_agents
from .knowledge import ClaimCheck, graph_payload, assess
from .discovery import DiscoveryQuery, discover, list_records, graph as discovery_graph
from .workbench import overview as workbench_overview, detail as workbench_detail

ROOT=Path(__file__).resolve().parent.parent
app=FastAPI(title='Bacterial Therapeutics Intelligence API',version='1.7.0',docs_url=None,redoc_url=None)
LIMITS=defaultdict(deque)

class ResearchRequest(BaseModel):
    question: str=Field(min_length=12,max_length=450)
    mode: Literal['full']='full'

def local_only_mode():
    # Explicit opt-in for localhost development. Never enable this when bound publicly.
    return os.getenv('BTI_LOCAL_MODE','') == '1'

async def auth(request: Request, authorization: str | None=Header(default=None)):
    if local_only_mode():
        # Only local TCP clients using a loopback Host may bypass bearer auth.
        # No wildcard CORS; Origin must be absent or match our local site.
        peer=request.client.host if request.client else ''
        host=request.headers.get('host','').lower()
        origin=request.headers.get('origin','')
        if peer not in ('127.0.0.1','::1') or host not in ('127.0.0.1:8015','localhost:8015','127.0.0.1:8000','localhost:8000'):
            raise HTTPException(403,'Local mode accepts loopback requests only.')
        if origin and origin not in ('http://127.0.0.1:8015','http://localhost:8015','http://127.0.0.1:8000','http://localhost:8000'):
            raise HTTPException(403,'Origin not allowed.')
        return True
    access=os.getenv('BTI_ACCESS_TOKEN','')
    if not access:
        raise HTTPException(503,'Server administrator must set BTI_ACCESS_TOKEN before research can be used.')
    if not authorization or not authorization.startswith('Bearer ') or not secrets.compare_digest(authorization[7:],access):
        raise HTTPException(401,'Access token required or invalid',headers={'WWW-Authenticate':'Bearer'})
    return True

@app.middleware('http')
async def secure_headers(request:Request,call_next):
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='no-referrer'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Cache-Control']='no-store'
    response.headers['Content-Security-Policy']="default-src 'self' 'unsafe-inline' https: data:; connect-src 'self' https://eutils.ncbi.nlm.nih.gov https://clinicaltrials.gov; object-src 'none'; frame-ancestors 'none'"
    return response

@app.get('/')
async def home():return FileResponse(ROOT/'frontend'/'index.html')

@app.get('/api/health')
async def health():
    return {'service':'Bacterial Therapeutics Intelligence','status':'ready' if os.getenv('OPENAI_API_KEY') and (local_only_mode() or os.getenv('BTI_ACCESS_TOKEN')) else 'configuration_required','auth_mode':'local_only' if local_only_mode() else 'bearer_token','agents':list(AREAS),'live_sources':['PubMed E-utilities','ClinicalTrials.gov v2'],'patent_status':'discovery-only; no automated patent record retrieval'}

@app.post('/api/research')
async def research(data: ResearchRequest, request:Request, _=Depends(auth)):
    if not os.getenv('OPENAI_API_KEY'):
        raise HTTPException(503,'OPENAI_API_KEY not configured; AI agents unavailable.')
    ip=request.client.host if request.client else 'unknown'
    now=time.monotonic(); q=LIMITS[ip]
    while q and now-q[0]>3600:q.popleft()
    if len(q)>=15:raise HTTPException(429,'Hourly research limit reached.')
    q.append(now)
    evidence,fetch_warnings=await fetch_evidence(data.question)
    if not evidence:
        return {'question':data.question,'status':'no_evidence','evidence':[],'findings':{},'synthesis':'No supporting source records were retrieved. No scientific conclusions were generated. Refine the query or check the upstream services.','warnings':fetch_warnings,'timestamp':datetime.now(timezone.utc).isoformat()}
    try:
        findings,synthesis,warnings=await run_agents(data.question,evidence)
    except Exception as e:
        raise HTTPException(502,'AI orchestration failed: '+type(e).__name__)
    return {'question':data.question,'status':'completed' if not warnings else 'partial','evidence':evidence,'findings':findings,'synthesis':synthesis,'warnings':fetch_warnings+warnings,'timestamp':datetime.now(timezone.utc).isoformat(),'disclaimer':'Research support only. PubMed title metadata and trial registry records are not full-text outcome reviews. Patent FTO, biosafety and regulatory status require independent review.'}

@app.get('/api/knowledge/graph')
async def knowledge_graph(area: Literal['All','Oncology','Cardiometabolic','Microbiome']='All'):
    return graph_payload(area)

@app.post('/api/knowledge/check')
async def knowledge_check(payload:ClaimCheck):
    return assess(payload.query,payload.area)

@app.post('/api/discovery/refresh')
async def discovery_refresh(payload:DiscoveryQuery, request:Request, _=Depends(auth)):
    ip=request.client.host if request.client else 'unknown'
    now=time.monotonic(); q=LIMITS['discovery:'+ip]
    while q and now-q[0]>3600:q.popleft()
    if len(q)>=6:raise HTTPException(429,'Discovery refresh limited to six times per hour.')
    q.append(now)
    return await discover(payload.area,payload.max_publications,payload.max_trials)

@app.get('/api/discovery/records')
async def discovery_records(area:Literal['All','Oncology','Cardiometabolic','Microbiome']='All',q:str='',limit:int=100,offset:int=0):
    if len(q)>100 or not 1<=limit<=250 or not 0<=offset<=10000:raise HTTPException(400,'Invalid filters')
    return list_records(area,q,limit,offset)

@app.get('/api/discovery/graph')
async def discovery_graph_route(area:Literal['All','Oncology','Cardiometabolic','Microbiome']='All'):
    return discovery_graph(area)

@app.get('/api/workbench/overview')
async def workbench_summary():
    return workbench_overview()

@app.get('/api/workbench/pathway/{claim_id}')
async def workbench_pathway(claim_id:str):
    if len(claim_id)>80 or not all(ch.isupper() or ch.isdigit() or ch=='_' for ch in claim_id):
        raise HTTPException(400,'Invalid pathway identifier')
    result=workbench_detail(claim_id)
    if result is None:raise HTTPException(404,'Unknown curated pathway')
    return result
