#!/bin/bash
# Sentinel TLS Certificate Generator
# Generates self-signed certificates for gRPC transport encryption
# Usage: ./scripts/generate-certs.sh [days_valid]

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

CERT_DIR="./certs"
DAYS=${1:-365}

echo -e "${BLUE}🔐 Sentinel TLS Certificate Generator${NC}"
echo "================================================"

# Check openssl
if ! command -v openssl &> /dev/null; then
    echo -e "${RED}❌ OpenSSL is not installed${NC}"
    echo "   Install: sudo apt install openssl (Debian/Ubuntu)"
    echo "   Install: sudo pacman -S openssl (Arch)"
    exit 1
fi

# Check existing certs
if [ -f "$CERT_DIR/server-cert.pem" ] && [ -f "$CERT_DIR/server-key.pem" ]; then
    EXPIRY=$(openssl x509 -enddate -noout -in "$CERT_DIR/server-cert.pem" 2>/dev/null | cut -d= -f2)
    echo -e "${YELLOW}⚠️  Existing certificates found (Expires: $EXPIRY)${NC}"
    read -p "   Overwrite? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Cancelled."
        exit 0
    fi
fi

mkdir -p "$CERT_DIR"

# Detect server IP for SAN
SERVER_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
HOSTNAME=$(hostname -f 2>/dev/null || hostname)

echo "   Server IP: ${SERVER_IP:-unknown}"
echo "   Hostname:  $HOSTNAME"
echo "   Validity:  $DAYS days"
echo ""

# Generate CA key + cert
echo "🔑 Generating CA..."
openssl req -x509 -newkey rsa:4096 -sha256 -days "$DAYS" -nodes \
    -keyout "$CERT_DIR/ca-key.pem" \
    -out "$CERT_DIR/ca-cert.pem" \
    -subj "/CN=Sentinel CA/O=Sentinel" \
    2>/dev/null

# Create SAN config
SAN_CONFIG=$(mktemp)
cat > "$SAN_CONFIG" <<EOF
[req]
distinguished_name = req_dn
req_extensions = v3_req
prompt = no

[req_dn]
CN = Sentinel Core
O = Sentinel

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
DNS.2 = sentinel_core
DNS.3 = $HOSTNAME
IP.1 = 127.0.0.1
EOF

# Add server IP if detected
if [ -n "$SERVER_IP" ]; then
    echo "IP.2 = $SERVER_IP" >> "$SAN_CONFIG"
fi

# Generate server key + CSR
echo "🔑 Generating server certificate..."
openssl req -newkey rsa:4096 -nodes \
    -keyout "$CERT_DIR/server-key.pem" \
    -out "$CERT_DIR/server-req.pem" \
    -config "$SAN_CONFIG" \
    2>/dev/null

# Sign with CA
openssl x509 -req -sha256 -days "$DAYS" \
    -in "$CERT_DIR/server-req.pem" \
    -CA "$CERT_DIR/ca-cert.pem" \
    -CAkey "$CERT_DIR/ca-key.pem" \
    -CAcreateserial \
    -out "$CERT_DIR/server-cert.pem" \
    -extfile "$SAN_CONFIG" \
    -extensions v3_req \
    2>/dev/null

# Cleanup
rm -f "$SAN_CONFIG" "$CERT_DIR/server-req.pem" "$CERT_DIR/ca-cert.srl"

# Verify
if [ -f "$CERT_DIR/server-cert.pem" ] && [ -f "$CERT_DIR/server-key.pem" ]; then
    echo ""
    echo "================================================"
    echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
    echo ""
    echo "   📁 $CERT_DIR/server-cert.pem  (Server certificate)"
    echo "   📁 $CERT_DIR/server-key.pem   (Server private key)"
    echo "   📁 $CERT_DIR/ca-cert.pem      (CA certificate)"
    echo "   📁 $CERT_DIR/ca-key.pem       (CA private key)"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "   1. Restart Sentinel: docker compose restart core"
    echo "   2. Remove SENTINEL_INSECURE_TLS=true from agent configs"
    echo "   3. Agents will need the CA cert for verification, or use"
    echo "      a proper certificate signed by a trusted CA"
else
    echo -e "${RED}❌ Certificate generation failed${NC}"
    exit 1
fi
