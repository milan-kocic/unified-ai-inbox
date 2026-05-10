# Unified AI Inbox - Uputstvo za instalaciju

## 1. Potrebni programi

- **Docker Desktop** (obavezno) - [https://www.docker.com/products/docker-desktop](https://www.docker.com/products/docker-desktop)
- **cloudflared** (za pristup sa telefona van WiFi) - [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

## 2. Pokretanje aplikacije

### Windows:
```cmd
start.bat
```

### Mac/Linux:
```bash
./start.sh
```

Aplikacija će biti dostupna na:
- Lokalno: http://localhost:3000
- LAN: http://VASA_IP:3000

## 3. Pristup sa telefona

### Na istom WiFi-u:
Otvorite browser na telefonu i unesite LAN adresu prikazanu prilikom pokretanja.

### Van WiFi-ja (preko interneta):
Ako imate instaliran `cloudflared`, start skripta će automatski kreirati javni URL (npr. `https://nesto.trycloudflare.com`).

Alternativno, ručno pokrenite:
```bash
cloudflared tunnel --url http://localhost:3000
```

## 4. Podešavanje Gmail naloga

1. Idite na Google Cloud Console: https://console.cloud.google.com
2. Kreirajte novi projekat
3. Idite na "APIs & Services" > "Credentials"
4. Kreirajte "OAuth client ID" (Desktop app)
5. Kopirajte Client ID i Client Secret u `.env` fajl
6. Omogućite Gmail API
7. U aplikaciji, Settings > Gmail > kliknite "Poveži Gmail"

## 5. Podešavanje WhatsApp-a

1. Idite u Settings > WhatsApp
2. Skenirajte QR kod sa vašim telefonom (WhatsApp > Linked Devices)
3. Sačekajte "Spreman" status
4. Aplikacija će automatski učitati do 100 postojećih poruka

## 6. Podešavanje Viber-a

1. Idite na https://partners.viber.com i kreirajte bot nalog
2. Kopirajte Auth Token
3. U aplikaciji, Settings > Viber > unesite token
4. Postavite webhook URL na: `https://VASA_ADRESA/api/webhooks/viber`

## 7. Podešavanje Slack-a

Pogledajte `SLACK-SETUP.md` za detaljno uputstvo.

## 8. Podešavanje AI provajdera

1. Izaberite provajdera (OpenAI, Anthropic, Gemini, Ollama ili Custom)
2. Unesite API ključ (osim za Ollama)
3. Izaberite model
4. Kliknite "Test konekcije"
5. Kada bude zeleno, kliknite "Sačuvaj"

Za Ollama (lokalni AI):
```bash
docker run -d -p 11434:11434 --name ollama ollama/ollama
```

## 9. Backup i obnova

### Automatski backup:
- Svaki dan u 02:00
- Fajlovi u `/backups/` folderu
- Briše starije od 30 dana

### Ručni backup:
```bash
./backup.sh    # Mac/Linux
backup.bat     # Windows
```

### Restore:
```bash
docker exec -i unified-inbox-postgres psql -U inbox inbox < backups/backup-YYYY-MM-DD.sql
```

## 10. Česta pitanja

**Q: QR kod se ne prikazuje?**  
A: Proverite da li Docker kontejneri rade: `docker ps`

**Q: Gmail prijavljuje grešku?**  
A: Proverite da li ste uneli Client ID i Secret u `.env` i restartovali.

**Q: AI ne radi?**  
A: Proverite API ključ i testirajte konekciju u Settings.

**Q: Kako ažurirati aplikaciju?**  
A: `docker-compose down && docker-compose up --build -d`
