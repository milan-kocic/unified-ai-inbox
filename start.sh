#!/bin/bash
echo "Pokretanje Unified AI Inbox..."
docker-compose up -d
sleep 10
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo "✅ Pokrenuto!"
echo "Lokalni: http://localhost:3000"
echo "LAN:     http://$LOCAL_IP:3000"
if command -v cloudflared &> /dev/null; then
  cloudflared tunnel --url http://localhost:3000 \
    --no-autoupdate 2>&1 | \
    grep -o 'https://.*trycloudflare.com' &
  sleep 3
else
  echo "INFO: Instalirajte cloudflared"
  echo "za pristup van WiFi. Vidite SETUP.md"
fi
echo "Zaustavljanje: ./stop.sh"
