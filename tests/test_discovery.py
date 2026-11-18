import asyncio
from pathlib import Path
from fastapi.testclient import TestClient
from backend import discovery
from backend.main import app

def test_persistence_and_dedup(tmp_path,monkeypatch):
    monkeypatch.setattr(discovery,'DB_PATH',tmp_path/'test.sqlite3')
    item={'id':'PUBMED:101','kind':'publication metadata','title':'Melanoma microbiome checkpoint study','url':'https://pubmed.ncbi.nlm.nih.gov/101/','published':'2022'}
    discovery.save_records('Oncology',[item,item])
    assert discovery.list_records()['total']==1
    assert discovery.list_records()['records'][0]['mapping_basis']=='keyword_cooccurrence_only'
    assert any(e['relation']=='title_mentions' for e in discovery.graph()['edges'])
    discovery.save_records('Cardiometabolic',[item]);assert discovery.list_records()['total']==2

def test_discovery_api(tmp_path,monkeypatch):
    monkeypatch.setattr(discovery,'DB_PATH',tmp_path/'api.sqlite3')
    c=TestClient(app)
    assert c.get('/api/discovery/records').status_code==200
    assert c.get('/api/discovery/graph').json()['records']==0
    assert c.get('/api/discovery/records?q='+'a'*101).status_code==400
    assert c.post('/api/discovery/refresh',json={'area':'invalid'}).status_code==503  # auth checked first without configured token

def test_refresh_network_failure_never_fabricates(tmp_path,monkeypatch):
    monkeypatch.setattr(discovery,'DB_PATH',tmp_path/'empty.sqlite3')
    async def fail(*args,**kwargs):return [],'service offline'
    monkeypatch.setattr(discovery,'retrieve_pubmed',fail)
    monkeypatch.setattr(discovery,'retrieve_trials',fail)
    response=asyncio.run(discovery.discover('Oncology'))
    assert response['newly_retrieved']==0
    assert response['stored_total']==0
    assert len(response['warnings'])==2
