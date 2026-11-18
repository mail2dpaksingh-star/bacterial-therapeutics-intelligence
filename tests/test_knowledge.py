from backend.knowledge import graph_payload,assess,CLAIMS,SOURCES

def test_sources_resolve():
    assert all(s in SOURCES for c in CLAIMS for s in c['sources'])

def test_graph_integrity():
    g=graph_payload('Oncology')
    nodes={n['id'] for n in g['nodes']}
    assert g['claims'] and all(x['area']=='Oncology' for x in g['claims'])
    assert all(x['from'] in nodes and x['to'] in nodes for x in g['edges'])

def test_approved_indication_not_generalized():
    result=assess('REBYOTA for recurrent C difficile infection')
    assert any(c['claim']['id']=='MICROBIOTA_CDI_REBYOTA' for c in result['matched'])
    assert any('indication' in flag for flag in result['flags'])

def test_hypothesis_no_verified_sources():
    c=next(c for c in CLAIMS if c['id']=='TMAO_CVD_HYPOTHESIS')
    assert c['sources']==[]
    result=assess('TMAO cardiovascular')
    assert any('Hypothesis' in f for f in result['flags'])

def test_not_claiming_contradiction():
    assert assess('melanoma microbiome')['contradiction_status']=='not_assessed'

def test_no_match_is_not_no_evidence():
    r=assess('unrelated zebra')
    assert not r['matched']
    assert 'not infer an absence' in r['flags'][0]
