#!/bin/bash
# ============================================================
# stashRx License Server — Deploy to Cloud Run
# ============================================================
#
# Prerequisites:
#   1. gcloud CLI installed and authenticated
#   2. A GCP project (stashrx-63954)
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
# After deployment, the URL will be printed.
# Update the CLIENT_ENDPOINT in app.html if the URL changes.
# ============================================================

set -e

# ─── Configuration ───────────────────────────────────────────
PROJECT_ID="stashrx-63954"
REGION="asia-southeast1"    # Same region as current deployment
SERVICE_NAME="generate-license"

# IMPORTANT: Change these secrets before deploying!
# Generate random secrets: openssl rand -hex 32
SERVER_SALT="CHANGE_ME_$(openssl rand -hex 16)"
HMAC_SECRET="CHANGE_ME_$(openssl rand -hex 16)"
ADMIN_KEY="CHANGE_ME_$(openssl rand -hex 16)"

# Approved devices (comma-separated). Add your first device here.
# Format: "DEVICE_ID_1,DEVICE_ID_2" or "DEVICE_ID_1:365,DEVICE_ID_2:730"
APPROVED_DEVICES=""

# Set to "true" to use Firestore instead of env var for device list
USE_FIRESTORE="false"
# ──────────────────────────────────────────────────────────────

echo ""
echo "============================================"
echo "  stashRx License Server Deployment"
echo "============================================"
echo ""
echo "Project:  $PROJECT_ID"
echo "Region:   $REGION"
echo "Service:  $SERVICE_NAME"
echo ""

# Check if secrets are still defaults
if [[ "$SERVER_SALT" == CHANGE_ME_* && "$HMAC_SECRET" == CHANGE_ME_* ]]; then
    echo "⚠️  Generating random secrets..."
    SERVER_SALT=$(openssl rand -hex 32)
    HMAC_SECRET=$(openssl rand -hex 32)
    ADMIN_KEY=$(openssl rand -hex 32)
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  SAVE THESE SECRETS — you'll need them!"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  SERVER_SALT:  $SERVER_SALT"
    echo "  HMAC_SECRET:  $HMAC_SECRET"
    echo "  ADMIN_KEY:    $ADMIN_KEY"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
fi

# Set project
gcloud config set project $PROJECT_ID

# Build and deploy
echo "Building and deploying..."
gcloud run deploy $SERVICE_NAME \
    --source . --clear-base-image \
    --region $REGION \
    --platform managed \
    --allow-unauthenticated \
    --set-env-vars="SERVER_SALT=$SERVER_SALT,HMAC_SECRET=$HMAC_SECRET,ADMIN_KEY=$ADMIN_KEY,APPROVED_DEVICES=$APPROVED_DEVICES,USE_FIRESTORE=$USE_FIRESTORE,GCP_PROJECT=$PROJECT_ID,DEFAULT_EXPIRY_DAYS=365,RATE_LIMIT=5" \
    --memory 256Mi \
    --cpu 1 \
    --min-instances 0 \
    --max-instances 3 \
    --timeout 30

echo ""
echo "✅ Deployment complete!"
echo ""
echo "Next steps:"
echo "  1. Approve devices with:"
echo "     curl -X POST <URL>/admin/approve \\"
echo "       -H 'Content-Type: application/json' \\"
echo "       -H 'X-Admin-Key: $ADMIN_KEY' \\"
echo "       -d '{\"deviceId\": \"YOUR_DEVICE_ID\"}'"
echo ""
