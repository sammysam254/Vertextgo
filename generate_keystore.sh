#!/data/data/com.termux/files/usr/bin/bash
# ============================================================
# VERTEX GO — Generate Signing Keystore in Termux
# Run ONCE to create your release signing key
# Then add the output to GitHub Secrets
# ============================================================

pkg install -y openjdk-17 2>/dev/null || pkg install -y openjdk-21 2>/dev/null

KEYSTORE="vertexgo-release.jks"
ALIAS="vertexgo"

echo "=== Vertex Go Release Keystore Generator ==="
echo ""
read -p "Store password (min 6 chars): " STORE_PASS
read -p "Key password (min 6 chars):   " KEY_PASS
read -p "Your name/company:            " DNAME

keytool -genkeypair \
  -keystore "$KEYSTORE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -storepass "$STORE_PASS" \
  -keypass "$KEY_PASS" \
  -dname "CN=$DNAME, O=VertexGo, L=Lusaka, ST=Lusaka, C=ZM"

echo ""
echo "=== ADD THESE TO GITHUB SECRETS ==="
echo ""
echo "KEYSTORE_BASE64:"
base64 "$KEYSTORE"
echo ""
echo "KEY_ALIAS:      $ALIAS"
echo "KEY_PASSWORD:   $KEY_PASS"
echo "STORE_PASSWORD: $STORE_PASS"
echo ""
echo "Keystore saved as: $KEYSTORE"
echo "Keep this file safe — you need it to update the app!"
