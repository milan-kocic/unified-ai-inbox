@echo off
echo Pokretanje Unified AI Inbox...
docker-compose up -d
timeout /t 10 /nobreak > nul
echo Pokrenuto!
echo Lokalni: http://localhost:3000
where cloudflared >nul 2>nul
if %errorlevel% == 0 (
  start /b cloudflared tunnel --url http://localhost:3000 --no-autoupdate
) else (
  echo INFO: Instalirajte cloudflared.
  echo Vidite SETUP.md
)
echo Zaustavljanje: stop.bat
