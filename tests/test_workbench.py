from backend.workbench import overview, detail
from backend.main import app
from fastapi.testclient import TestClient

def test_overview_claims_and_tiers():
    d=overview()
    assert len(d['claims']) >= 9
    assert all('evidence_label' in c and 'curated_sources' in c for c in d['claims'])
    assert any(not c['has_verifying_source'] for c in d['claims'])

def test_pathway_review_fields():
    r=detail('BCG_NMIBC')
    assert len(r['pathway']) == 4
    assert len(r['curated_sources']) >= 1
    assert all(x['url'].startswith('https://') for x in r['curated_sources'])
    assert 'no novelty or FTO' in r['warnings'][2]
    assert r['patent_lead']['alternate_url'].startswith('https://patents.google.com/')

def test_hypothesis_not_promoted_to_evidence():
    r=detail('TMAO_CVD_HYPOTHESIS')
    assert r['claim']['grade']=='hypothesis'
    assert r['curated_sources']==[]
    assert r['claim']['has_verifying_source'] is False

def test_workbench_api():
    client=TestClient(app)
    assert client.get('/api/workbench/overview').status_code==200
    assert client.get('/api/workbench/pathway/BCG_NMIBC').status_code==200
    assert client.get('/api/workbench/pathway/NOTREAL').status_code==404
    assert client.get('/api/workbench/pathway/../../etc').status_code in (400,404)
