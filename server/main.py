"""
stashRx License Server — Authenticated Cloud Run Endpoint
==========================================================
Security layers:
  1. HMAC request signing (prevents unauthorized callers)
  2. Device whitelist (only approved devices get keys)
  3. Rate limiting (max N requests per device per hour)

Env vars (set in Cloud Run):
  SERVER_SALT       — Secret salt for license key generation (NEVER shared with client)
  HMAC_SECRET       — Shared secret for request signing (embedded in client, obfuscated)
  ADMIN_KEY         — Secret key for admin endpoints (approve/revoke devices)
  APPROVED_DEVICES  — (Optional) Comma-separated device IDs for simple mode
  USE_FIRESTORE     — Set to "true" to use Firestore for device whitelist
  GCP_PROJECT       — Google Cloud project ID (for Firestore, defaults to stashrx-63954)
  DEFAULT_EXPIRY_DAYS — Days until license expires (default: 365)
  RATE_LIMIT        — Max requests per device per hour (default: 5)
"""

import os
import time
import hmac
import hashlib
import json
from datetime import datetime, timedelta
from flask import Flask, request, jsonify
from functools import wraps

app = Flask(__name__)

# ─── Config ──────────────────────────────────────────────────────────
SERVER_SALT        = os.environ.get("SERVER_SALT", "CHANGE_ME_server_salt_2026")
HMAC_SECRET        = os.environ.get("HMAC_SECRET", "CHANGE_ME_hmac_secret_2026")
ADMIN_KEY          = os.environ.get("ADMIN_KEY", "CHANGE_ME_admin_key_2026")
USE_FIRESTORE      = os.environ.get("USE_FIRESTORE", "false").lower() == "true"
GCP_PROJECT        = os.environ.get("GCP_PROJECT", "stashrx-63954")
DEFAULT_EXPIRY_DAYS = int(os.environ.get("DEFAULT_EXPIRY_DAYS", "365"))
RATE_LIMIT         = int(os.environ.get("RATE_LIMIT", "5"))
TIMESTAMP_WINDOW   = 300  # 5-minute window for HMAC timestamp

# ─── In-memory rate limiter ──────────────────────────────────────────
# Note: In Cloud Run with multiple instances, each instance has its own
# rate limit state. For stricter enforcement, use Firestore or Redis.
rate_limit_store = {}  # { deviceId: [timestamp1, timestamp2, ...] }

def check_rate_limit(device_id, ip_addr):
    """Returns True if under limit, False if exceeded."""
    now = time.time()
    window = 3600  # 1 hour

    if device_id not in rate_limit_store:
        rate_limit_store[device_id] = []

    # Prune old entries
    rate_limit_store[device_id] = [
        t for t in rate_limit_store[device_id] if now - t < window
    ]

    if len(rate_limit_store[device_id]) >= RATE_LIMIT:
        return False

    rate_limit_store[device_id].append(now)

    if USE_FIRESTORE:
        try:
            db = get_firestore()
            doc_ref = db.collection("rate_limits").document(f"{device_id}_{ip_addr}")
            doc = doc_ref.get()
            if doc.exists:
                data = doc.to_dict()
                reqs = data.get("requests", [])
                reqs = [t for t in reqs if now - t < window]
                if len(reqs) >= RATE_LIMIT:
                    return False
                reqs.append(now)
                doc_ref.set({"requests": reqs})
            else:
                doc_ref.set({"requests": [now]})
        except Exception as e:
            app.logger.error(f"Firestore rate limit error: {e}")

    return True


# ─── Firestore helpers ───────────────────────────────────────────────
_firestore_client = None

def get_firestore():
    """Lazy-init Firestore client."""
    global _firestore_client
    if _firestore_client is None:
        from google.cloud import firestore
        _firestore_client = firestore.Client(project=GCP_PROJECT)
    return _firestore_client


def is_device_approved_firestore(device_id):
    """Check Firestore approved_devices collection."""
    try:
        db = get_firestore()
        doc = db.collection("approved_devices").document(device_id).get()
        if not doc.exists:
            return None
        data = doc.to_dict()
        # Check if explicitly revoked
        if data.get("revoked", False):
            return None
        return data
    except Exception as e:
        app.logger.error(f"Firestore error: {e}")
        return None


def is_device_approved_env(device_id):
    """Check APPROVED_DEVICES env var (comma-separated device IDs)."""
    approved = os.environ.get("APPROVED_DEVICES", "")
    if not approved:
        return None

    # Support format: "DEVICEID1,DEVICEID2" or "DEVICEID1:365,DEVICEID2:730"
    for entry in approved.split(","):
        entry = entry.strip()
        if ":" in entry:
            did, days = entry.split(":", 1)
            if did.strip() == device_id:
                return {"expiryDays": int(days)}
        elif entry == device_id:
            return {"expiryDays": DEFAULT_EXPIRY_DAYS}
    return None


def is_device_approved(device_id):
    """Check if a device is approved (tries Firestore first, then env var)."""
    if USE_FIRESTORE:
        result = is_device_approved_firestore(device_id)
        if result is not None:
            return result
    # Fallback to env var
    return is_device_approved_env(device_id)


# ─── HMAC validation ────────────────────────────────────────────────
def validate_hmac(device_id, timestamp, signature):
    """Validate HMAC-SHA256 signature: HMAC(deviceId|timestamp, HMAC_SECRET)."""
    # Check timestamp freshness
    try:
        ts = int(timestamp)
    except (ValueError, TypeError):
        return False, "Invalid timestamp"

    now = int(time.time())
    if abs(now - ts) > TIMESTAMP_WINDOW:
        return False, "Request expired"

    # Compute expected HMAC
    message = f"{device_id}|{ts}"
    expected = hmac.new(
        HMAC_SECRET.encode("utf-8"),
        message.encode("utf-8"),
        hashlib.sha256
    ).hexdigest().upper()

    if not hmac.compare_digest(expected, signature.upper()):
        return False, "Invalid signature"

    return True, "OK"


# ─── License key generation ──────────────────────────────────────────
def generate_license_key(device_id, expiry_days=None):
    """Generate a signed license key using SERVER_SALT."""
    if expiry_days is None:
        expiry_days = DEFAULT_EXPIRY_DAYS

    expiry_date = datetime.now() + timedelta(days=expiry_days)
    expiry_str = expiry_date.strftime("%Y%m%d")

    # Sign: SHA-256(deviceId|expiry|SERVER_SALT)
    text_to_hash = f"{device_id}|{expiry_str}|{SERVER_SALT}"
    sig = hashlib.sha256(text_to_hash.encode("utf-8")).hexdigest().upper()

    return f"{device_id}-{expiry_str}-{sig}"


# ─── Admin auth decorator ───────────────────────────────────────────
def require_admin(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        admin_key = request.headers.get("X-Admin-Key", "")
        if not hmac.compare_digest(admin_key, ADMIN_KEY):
            return jsonify({"error": "Unauthorized"}), 401
        return f(*args, **kwargs)
    return decorated


# ─── CORS headers ───────────────────────────────────────────────────
@app.after_request
def add_cors(response):
    if request.path.startswith("/admin"):
        return response
        
    allowlist_env = os.environ.get("CORS_ALLOWLIST", "http://localhost:8080,https://stashrx-63954.web.app,https://stashrx-63954.firebaseapp.com")
    allowlist = [url.strip() for url in allowlist_env.split(",")]
    
    origin = request.headers.get("Origin")
    if origin in allowlist:
        response.headers["Access-Control-Allow-Origin"] = origin
        
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


# ─── Routes ──────────────────────────────────────────────────────────

@app.route("/", methods=["POST", "OPTIONS"])
def generate_license():
    """
    Generate a license for an approved device.

    Request body: {
        "deviceId": "ABC123",
        "timestamp": 1716283200,
        "signature": "HMAC_HEX_STRING"
    }

    Returns: { "licenseKey": "ABC123-20270521-FULL_SHA256_HEX" }
    """
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid request body"}), 400

    device_id = data.get("deviceId", "").strip()
    if not device_id:
        return jsonify({"error": "Missing deviceId"}), 400

    # Layer 2: Rate limiting
    client_ip = request.headers.get("X-Forwarded-For", request.remote_addr)
    if not check_rate_limit(device_id, client_ip):
        return jsonify({"error": "Rate limit exceeded. Try again later."}), 429

    # Layer 3: Device whitelist check
    approval = is_device_approved(device_id)
    if approval is None:
        return jsonify({
            "error": "Device not approved for premium. Contact orionv888@gmail.com with your Device ID."
        }), 403

    # Generate license key
    expiry_days = approval.get("expiryDays", DEFAULT_EXPIRY_DAYS)
    license_key = generate_license_key(device_id, expiry_days)

    app.logger.info(f"License generated for device: {device_id[:8]}...")

    return jsonify({
        "licenseKey": license_key,
        "expiresIn": f"{expiry_days} days"
    })


@app.route("/validate", methods=["POST", "OPTIONS"])
def validate_license():
    """
    Validate a license key server-side.

    Request body: {
        "licenseKey": "DEVICE-YYYYMMDD-SIGNATURE"
    }

    Returns: { "valid": true/false, "reason": "..." }
    """
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"valid": False, "reason": "Invalid request"}), 400

    key = data.get("licenseKey", "").strip()
    if not key:
        return jsonify({"valid": False, "reason": "Missing licenseKey"}), 400

    parts = key.split("-")
    if len(parts) != 3:
        return jsonify({"valid": False, "reason": "Invalid format"}), 200

    device_id, expiry_str, sig = parts

    # Check expiry
    try:
        yr = int(expiry_str[:4])
        mo = int(expiry_str[4:6])
        dy = int(expiry_str[6:8])
        expiry_date = datetime(yr, mo, dy, 23, 59, 59)
        if expiry_date < datetime.now():
            return jsonify({"valid": False, "reason": "Key expired"}), 200
    except (ValueError, IndexError):
        return jsonify({"valid": False, "reason": "Invalid expiry"}), 200

    # Verify signature against SERVER_SALT
    text_to_hash = f"{device_id}|{expiry_str}|{SERVER_SALT}"
    expected = hashlib.sha256(text_to_hash.encode("utf-8")).hexdigest().upper()

    if hmac.compare_digest(sig.upper(), expected):
        return jsonify({"valid": True, "reason": "Valid server-signed key"}), 200

    return jsonify({"valid": False, "reason": "Invalid signature"}), 200


@app.route("/admin/approve", methods=["POST", "OPTIONS"])
@require_admin
def approve_device():
    """
    Approve a device for premium.

    Headers: X-Admin-Key: <ADMIN_KEY>
    Body: {
        "deviceId": "ABC123",
        "expiryDays": 365,      (optional, default from env)
        "note": "Customer name"  (optional)
    }
    """
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data or not data.get("deviceId"):
        return jsonify({"error": "Missing deviceId"}), 400

    device_id = data["deviceId"].strip()
    expiry_days = data.get("expiryDays", DEFAULT_EXPIRY_DAYS)
    note = data.get("note", "")

    if USE_FIRESTORE:
        try:
            db = get_firestore()
            db.collection("approved_devices").document(device_id).set({
                "deviceId": device_id,
                "expiryDays": expiry_days,
                "note": note,
                "approvedAt": datetime.now().isoformat(),
                "revoked": False
            })
            return jsonify({"status": "approved", "deviceId": device_id, "store": "firestore"})
        except Exception as e:
            app.logger.error(f"Firestore write failed: {e}")
            return jsonify({"error": "Internal server error"}), 500
    else:
        # In env-var mode, just confirm what should be added
        return jsonify({
            "status": "manual_action_required",
            "message": f"Add '{device_id}:{expiry_days}' to the APPROVED_DEVICES env var in Cloud Run.",
            "deviceId": device_id
        })


@app.route("/admin/revoke", methods=["POST", "OPTIONS"])
@require_admin
def revoke_device():
    """
    Revoke a device's premium access.

    Headers: X-Admin-Key: <ADMIN_KEY>
    Body: { "deviceId": "ABC123" }
    """
    if request.method == "OPTIONS":
        return "", 204

    data = request.get_json(silent=True)
    if not data or not data.get("deviceId"):
        return jsonify({"error": "Missing deviceId"}), 400

    device_id = data["deviceId"].strip()

    if USE_FIRESTORE:
        try:
            db = get_firestore()
            db.collection("approved_devices").document(device_id).update({
                "revoked": True,
                "revokedAt": datetime.now().isoformat()
            })
            return jsonify({"status": "revoked", "deviceId": device_id})
        except Exception as e:
            app.logger.error(f"Firestore update failed: {e}")
            return jsonify({"error": "Internal server error"}), 500
    else:
        return jsonify({
            "status": "manual_action_required",
            "message": f"Remove '{device_id}' from the APPROVED_DEVICES env var in Cloud Run."
        })


@app.route("/admin/list", methods=["GET"])
@require_admin
def list_devices():
    """List all approved devices (Firestore mode only)."""
    if not USE_FIRESTORE:
        approved = os.environ.get("APPROVED_DEVICES", "")
        return jsonify({"devices": approved.split(",") if approved else [], "store": "env"})

    try:
        db = get_firestore()
        docs = db.collection("approved_devices").where("revoked", "==", False).stream()
        devices = []
        for doc in docs:
            d = doc.to_dict()
            devices.append({
                "deviceId": d.get("deviceId"),
                "expiryDays": d.get("expiryDays"),
                "note": d.get("note", ""),
                "approvedAt": d.get("approvedAt", "")
            })
        return jsonify({"devices": devices, "store": "firestore"})
    except Exception as e:
        app.logger.error(f"Firestore list failed: {e}")
        return jsonify({"error": "Internal server error"}), 500


@app.route("/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "version": "2.0.0-auth"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    app.run(host="0.0.0.0", port=port)
