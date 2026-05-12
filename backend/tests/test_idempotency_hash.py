from services.idempotency_service import build_request_hash


def test_request_hash_changes_with_payload():
    h1 = build_request_hash(method="POST", url_path="/x", query={}, body={"a": 1})
    h2 = build_request_hash(method="POST", url_path="/x", query={}, body={"a": 2})
    assert h1 != h2

