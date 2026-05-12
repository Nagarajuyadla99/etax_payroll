import base64
import os

import pytest

from utils.encryption import decrypt_text, encrypt_text, mask_account_number


@pytest.fixture(autouse=True)
def _set_master_key(monkeypatch):
    key = base64.urlsafe_b64encode(os.urandom(32)).decode("utf-8")
    monkeypatch.setenv("ENCRYPTION_MASTER_KEY", key)


def test_encrypt_decrypt_roundtrip():
    v = encrypt_text("123456789012", aad="employee:1")
    assert v.nonce_b64
    assert v.ciphertext_b64
    out = decrypt_text(v.nonce_b64, v.ciphertext_b64, aad="employee:1")
    assert out == "123456789012"


def test_encrypt_fails_on_wrong_aad():
    v = encrypt_text("123456789012", aad="employee:1")
    with pytest.raises(Exception):
        decrypt_text(v.nonce_b64, v.ciphertext_b64, aad="employee:2")


def test_mask_account_number():
    masked, last4 = mask_account_number("123456789012")
    assert last4 == "9012"
    assert masked.endswith("9012")
    assert "*" in masked

