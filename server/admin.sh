#!/bin/bash
# ============================================================
# stashRx Admin CLI — Manage Premium Devices
# ============================================================
#
# Usage:
#   ./admin.sh approve <DEVICE_ID> [DAYS]  — Approve a device
#   ./admin.sh revoke  <DEVICE_ID>         — Revoke a device
#   ./admin.sh list                        — List approved devices
#   ./admin.sh test    <DEVICE_ID>         — Test generating a key
#   ./admin.sh health                      — Check server health
#
# Before using, set these:
#   export STASHRX_URL="https://generate-license-cpmhktrscq-as.a.run.app"
#   export STASHRX_ADMIN_KEY="your_admin_key_here"
#   export STASHRX_HMAC_SECRET="your_hmac_secret_here"
# ============================================================

URL="${STASHRX_URL:-https://generate-license-cpmhktrscq-as.a.run.app}"
ADMIN_KEY="${STASHRX_ADMIN_KEY:-}"
HMAC_SECRET="${STASHRX_HMAC_SECRET:-}"

if [ -z "$ADMIN_KEY" ]; then
    echo "Error: Set STASHRX_ADMIN_KEY environment variable"
    exit 1
fi

case "$1" in
    approve)
        DEVICE_ID="$2"
        DAYS="${3:-365}"
        if [ -z "$DEVICE_ID" ]; then
            echo "Usage: $0 approve <DEVICE_ID> [DAYS]"
            exit 1
        fi
        echo "Approving device: $DEVICE_ID for $DAYS days..."
        curl -s -X POST "$URL/admin/approve" \
            -H "Content-Type: application/json" \
            -H "X-Admin-Key: $ADMIN_KEY" \
            -d "{\"deviceId\": \"$DEVICE_ID\", \"expiryDays\": $DAYS}" | python3 -m json.tool
        ;;

    revoke)
        DEVICE_ID="$2"
        if [ -z "$DEVICE_ID" ]; then
            echo "Usage: $0 revoke <DEVICE_ID>"
            exit 1
        fi
        echo "Revoking device: $DEVICE_ID..."
        curl -s -X POST "$URL/admin/revoke" \
            -H "Content-Type: application/json" \
            -H "X-Admin-Key: $ADMIN_KEY" \
            -d "{\"deviceId\": \"$DEVICE_ID\"}" | python3 -m json.tool
        ;;

    list)
        echo "Listing approved devices..."
        curl -s -X GET "$URL/admin/list" \
            -H "X-Admin-Key: $ADMIN_KEY" | python3 -m json.tool
        ;;

    test)
        DEVICE_ID="$2"
        if [ -z "$DEVICE_ID" ] || [ -z "$HMAC_SECRET" ]; then
            echo "Usage: STASHRX_HMAC_SECRET=xxx $0 test <DEVICE_ID>"
            exit 1
        fi
        TIMESTAMP=$(date +%s)
        SIGNATURE=$(echo -n "${DEVICE_ID}|${TIMESTAMP}" | openssl dgst -sha256 -hmac "$HMAC_SECRET" | awk '{print toupper($2)}')
        echo "Testing license generation for: $DEVICE_ID"
        echo "  Timestamp: $TIMESTAMP"
        echo "  Signature: $SIGNATURE"
        curl -s -X POST "$URL" \
            -H "Content-Type: application/json" \
            -d "{\"deviceId\": \"$DEVICE_ID\", \"timestamp\": $TIMESTAMP, \"signature\": \"$SIGNATURE\"}" | python3 -m json.tool
        ;;

    health)
        curl -s "$URL/health" | python3 -m json.tool
        ;;

    *)
        echo "stashRx Admin CLI"
        echo ""
        echo "Commands:"
        echo "  approve <DEVICE_ID> [DAYS]  — Approve device for premium"
        echo "  revoke  <DEVICE_ID>         — Revoke premium access"
        echo "  list                        — List all approved devices"
        echo "  test    <DEVICE_ID>         — Test license generation (needs HMAC_SECRET)"
        echo "  health                      — Check server status"
        ;;
esac
