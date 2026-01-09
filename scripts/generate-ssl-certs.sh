#!/bin/bash

# Scripts to generate local SSL certificates with mkcert
# These certificates will be recognized by all devices where the root CA is installed

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="$SCRIPT_DIR/ssl"
DOMAIN="home-monitor.local"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🔐 Generating SSL certificates for Home Monitor${NC}"
echo ""

# Check if mkcert is installed
if ! command -v mkcert &> /dev/null; then
    echo -e "${YELLOW}mkcert is not installed. Installing...${NC}"
    
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        brew install mkcert nss
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        if command -v apt &> /dev/null; then
            sudo apt update && sudo apt install -y libnss3-tools
            curl -JLO "https://dl.filippo.io/mkcert/latest?for=linux/amd64"
            chmod +x mkcert-v*-linux-amd64
            sudo mv mkcert-v*-linux-amd64 /usr/local/bin/mkcert
        else
            echo -e "${RED}Please install mkcert manually: https://github.com/FiloSottile/mkcert${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✓ mkcert installed${NC}"
fi

# Install the local root CA (only once per machine)
echo -e "${YELLOW}Installing local root CA...${NC}"
mkcert -install
echo -e "${GREEN}✓ CA root installed${NC}"

# Create the ssl directory
mkdir -p "$CERT_DIR"

# Generate the certificates
echo -e "${YELLOW}Generating certificates for: localhost, $DOMAIN, 100.92.138.27, 192.168.* ...${NC}"
cd "$CERT_DIR"

# Generate certificates for multiple domains/IPs
# Add your machine's local network IP if you know it
mkcert -cert-file cert.pem -key-file key.pem \
    localhost \
    "*.local" \
    "*.ts.net" \
    "$DOMAIN" \
    "192.168.1.1" \
    "192.168.1.100" \
    "192.168.1.101" \
    "192.168.1.102" \
    "192.168.1.165" \
    "100.92.138.27" \
    "10.0.0.1" \
    "10.0.0.100" \
    127.0.0.1 \
    ::1

echo ""
echo -e "${GREEN}✅ Certificates generated successfully!${NC}"
echo ""
echo -e "📁 Files created:"
echo -e "   - ${CERT_DIR}/cert.pem"
echo -e "   - ${CERT_DIR}/key.pem"
echo ""
echo -e "${YELLOW}📱 To install the certificate on iPhone/Android:${NC}"
echo ""
echo -e "1. Copy the root CA to your phone:"
echo -e "   ${GREEN}mkcert -CAROOT${NC}"
echo -e "   → Send the file ${GREEN}rootCA.pem${NC} via AirDrop/email"
echo ""
echo -e "2. On ${GREEN}iPhone${NC}:"
echo -e "   - Open the file → Install the profile"
echo -e "   - Settings → General → About → Certificate Settings"
echo -e "   - Enable trust for the certificate"
echo ""
echo -e "3. On ${GREEN}Android${NC}:"
echo -e "   - Settings → Security → Encryption & credentials"
echo -e "   - Install a certificate → A certificate"
echo ""
echo -e "${YELLOW}🌐 Add this entry to /etc/hosts on your machine:${NC}"
echo -e "   ${GREEN}127.0.0.1    home-monitor.local${NC}"
echo ""
echo -e "${YELLOW}📱 On your phone, connect to:${NC}"
echo -e "${GREEN}https://<YOUR-MACHINE-IP>${NC}"