import asyncio
import os
from fastapi.testclient import TestClient
from backend.main import app
from backend.engine import retrieve_pubmed, retrieve_trials, AREAS

client=TestClient(app)
def test_health():
    r=client.get('/api/health')
    assert r.status_code==200 and len(r.json()['agents'])==5

def test_auth_missing_token(monkeypatch):
    monkeypatch.setenv('BTI_ACCESS_TOKEN','test-strong-token')
    r=client.post('/api/research',json={'question':'bacterial immunotherapy evidence'})
    assert r.status_code==401

def test_config_missing(monkeypatch):
    monkeypatch.setenv('BTI_ACCESS_TOKEN','test-strong-token')
    monkeypatch.delenv('OPENAI_API_KEY',raising=False)
    r=client.post('/api/research',headers={'Authorization':'Bearer test-strong-token'},json={'question':'bacterial immunotherapy evidence'})
    assert r.status_code==503

def test_request_validation(monkeypatch):
    monkeypatch.setenv('BTI_ACCESS_TOKEN','test-strong-token')
    r=client.post('/api/research',headers={'Authorization':'Bearer test-strong-token'},json={'question':'short'})
    assert r.status_code==422

class Dummy:
    async def get(self,*args,**kwargs):
        raise __import__('httpx').ConnectError('offline')
def test_network_fail_is_explicit():
    pub,err=asyncio.run(retrieve_pubmed(Dummy(),'microbiome'))
    tr,err2=asyncio.run(retrieve_trials(Dummy(),'cancer'))
    assert not pub and err and not tr and err2

def test_home():
    r=client.get('/')
    assert r.status_code==200 and 'Live Multi-Agent Scientific Intelligence' in r.text
