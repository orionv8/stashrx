import hashlib
import time

SECRET_SALT = 'stashRx_b1r_s3cr3t_2026'
device_id = 'F1D3781B'

# License format: {DEVICE_ID}-{EXPIRY_YYYYMMDD}-{SIGNATURE}
# We'll set expiry to far future, e.g., 20991231
expiry = '20991231'

# The signature logic in JS:
# const _0x57f3cb = _0x2143ac + '|' + _0x5001fe + '|' + SECRET_SALT
# Here: _0x2143ac is device_id, _0x5001fe is expiry
text_to_hash = f"{device_id}|{expiry}|{SECRET_SALT}"

# SHA-256 hash (crypto.subtle.digest('SHA-256'))
hasher = hashlib.sha256()
hasher.update(text_to_hash.encode('utf-8'))
full_hash_hex = hasher.hexdigest()

# JS takes the first 16 chars of the hex and makes it upper case
signature = full_hash_hex[:16].upper()

license_key = f"{device_id}-{expiry}-{signature}"
print(f"Generated License Key: {license_key}")
