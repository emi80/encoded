import pytest

targets = [
    {'name': 'one', 'uuid': '775795d3-4410-4114-836b-8eeecf1d0c2f'},
    {'name': 'two', 'uuid': 'd6784f5e-48a1-4b40-9b11-c8aefb6e1377'},
    {'name': 'quote:name', 'uuid': '0e627b3b-f5d2-41db-ac34-8e97bb8a028c'},
]

sources = [
    {
        'name': 'A',
        'target': 'one',
        'uuid': '16157204-8c8f-4672-a1a4-14f4b8021fcd',
        'status': 'current',
    },
    {
        'name': 'B',
        'target': 'two',
        'uuid': '1e152917-c5fd-4aec-b74f-b0533d0cc55c',
        'status': 'deleted',
    },
]


@pytest.fixture
def content(testapp):
    url = '/testing-link-targets/'
    for item in targets:
        testapp.post_json(url, item, status=201)

    url = '/testing-link-sources/'
    for item in sources:
        testapp.post_json(url, item, status=201)


def test_links_add(content, session):
    from ..storage import Link
    links = sorted([
        (str(link.source_rid), link.rel, str(link.target_rid))
        for link in session.query(Link).all()
    ])
    expected = sorted([
        (sources[0]['uuid'], u'target', targets[0]['uuid']),
        (sources[1]['uuid'], u'target', targets[1]['uuid']),
    ])
    assert links == expected


def test_links_update(content, testapp, session):
    from ..storage import Link

    url = '/testing-link-sources/' + sources[1]['uuid']
    new_item = {'name': 'B updated', 'target': targets[0]['name']}
    testapp.put_json(url, new_item, status=200)

    links = sorted([
        (str(link.source_rid), link.rel, str(link.target_rid))
        for link in session.query(Link).all()
    ])
    expected = sorted([
        (sources[0]['uuid'], u'target', targets[0]['uuid']),
        (sources[1]['uuid'], u'target', targets[0]['uuid']),
    ])
    assert links == expected


def test_links_reverse(content, testapp, session):
    target = targets[0]
    res = testapp.get('/testing-link-targets/%s/?frame=object' % target['name'])
    assert res.json['reverse'] == ['/testing-link-sources/%s/' % sources[0]['uuid']]

    # DELETED sources are hidden from the list.
    target = targets[1]
    res = testapp.get('/testing-link-targets/%s/' % target['name'])
    assert res.json['reverse'] == []


def test_links_quoted_ids(content, testapp, session):
    res = testapp.get('/testing-link-targets/quote:name/?frame=object')
    target = res.json
    source = {'name': 'C', 'target': target['@id']}
    testapp.post_json('/testing-link-sources/', source, status=201)
