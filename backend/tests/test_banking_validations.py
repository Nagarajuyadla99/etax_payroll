from api.banking_routes import IFSC_RE, SWIFT_RE


def test_ifsc_validation_regex():
    assert IFSC_RE.match("HDFC0123456")
    assert not IFSC_RE.match("HDFC123456")  # missing 0 in position 5


def test_swift_validation_regex():
    assert SWIFT_RE.match("HDFCINBB")
    assert SWIFT_RE.match("HDFCINBBXXX")
    assert not SWIFT_RE.match("HDFC1NBB")  # invalid

