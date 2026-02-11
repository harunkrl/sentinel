#!/bin/bash
set -e

# Usage: ./gen_certs.sh [IP_ADDRESS]
# Default IP: 127.0.0.1
IP=${1:-127.0.0.1}
HOST="localhost"

echo "🔐 Generating Professional TLS Certificates for IP: $IP"

mkdir -p certs
# Attempt to clean up. If owned by root (from docker), this might fail without sudo
rm -f certs/*.pem certs/*.srl certs/*.cnf || echo "⚠️  Warning: Failed to clean certs dir. You might need to run 'sudo rm -rf certs/*' if they were created by Docker."

# 1. Generate Root CA (Certificate Authority)
# This is the "Master Key" that will sign everything else.
echo "1. Generating Root CA..."
openssl req -x509 -newkey rsa:4096 -days 3650 -nodes \
  -keyout certs/ca-key.pem -out certs/ca-cert.pem \
  -subj "/C=US/ST=State/L=City/O=Sentinel Root CA/OU=Sentinel/CN=SentinelRoot"

# 2. Generate Server Private Key
echo "2. Generating Server Key..."
openssl genrsa -out certs/server-key.pem 4096

# 3. Create Server Certificate Signing Request (CSR)
echo "3. Creating Server CSR..."
openssl req -new -key certs/server-key.pem -out certs/server-req.pem \
  -subj "/C=US/ST=State/L=City/O=Sentinel Server/OU=Sentinel/CN=$IP"

# 4. Create Extension Config for SAN (Subject Alternative Name)
# This is CRITICAL for Go/Chrome to accept the cert for an IP address.
cat > certs/server-ext.cnf <<EOF
authorityKeyIdentifier=keyid,issuer
basicConstraints=CA:FALSE
keyUsage = digitalSignature, nonRepudiation, keyEncipherment, dataEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = $HOST
IP.1 = $IP
IP.2 = 127.0.0.1
EOF

# 5. Sign the Server Cert with the Root CA
echo "4. Signing Server Cert..."
openssl x509 -req -in certs/server-req.pem -days 365 \
  -CA certs/ca-cert.pem -CAkey certs/ca-key.pem -CAcreateserial \
  -out certs/server-cert.pem -extfile certs/server-ext.cnf

# Cleanup
rm certs/server-req.pem certs/server-ext.cnf certs/*.srl

echo "✅ Certificates Generated in 'certs/'"
echo "   - ca-cert.pem      (Public Root CA - Distribute to Agents)"
echo "   - server-cert.pem  (Server Certificate - Keep on Server)"
echo "   - server-key.pem   (Server Private Key - Keep on Server)"
echo "   - ca-key.pem       (Root CA Key - KEEP SECRET/OFFLINE)"
