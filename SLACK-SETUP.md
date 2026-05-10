# Slack Setup - Korak po korak

## 1. Kreiranje Slack App

1. Idite na [https://api.slack.com/apps](https://api.slack.com/apps)
2. Kliknite **"Create New App"**
3. Izaberite **"From scratch"**
4. Unesite naziv aplikacije (npr. "Unified AI Inbox")
5. Izaberite vaš workspace
6. Kliknite **"Create App"**

## 2. OAuth & Permissions

1. Idite na **"OAuth & Permissions"** u levom meniju
2. Skrolujte do **"Scopes"** > **"Bot Token Scopes"**
3. Dodajte sledeće scope-ove:
   - `channels:history` - čitanje poruka iz kanala
   - `channels:read` - lista kanala
   - `chat:write` - slanje poruka
   - `im:history` - čitanje DM poruka
   - `im:read` - lista DM konverzacija
   - `im:write` - slanje DM poruka
   - `users:read` - info o korisnicima
   - `team:read` - info o workspace-u
4. Skrolujte do vrha i kliknite **"Install to Workspace"**
5. Dozvolite dozvole
6. Kopirajte **"Bot User OAuth Token"** (počinje sa `xoxb-`)

## 3. Socket Mode aktivacija

1. Idite na **"Socket Mode"** u levom meniju
2. Prebacite na **"On"**
3. Kliknite **"Generate Token and Scopes"**
4. Izaberite `connections:write` scope
5. Generišite token (počinje sa `xapp-`)
6. Kopirajte **"App-Level Token"**

## 4. Povezivanje u aplikaciji

1. Otvorite Unified AI Inbox > Settings > Slack
2. Nalepite **Bot Token** (`xoxb-...`)
3. Nalepite **App Token** (`xapp-...`)
4. Izaberite koje poruke želite da primate:
   - DM poruke
   - Spominjanja (@bot)
   - Sve poruke iz kanala
5. Kliknite **"Poveži Slack"**
6. Ako se pita za uvoz istorije, izaberite period i tip poruka

## 5. Dodavanje bota u kanale

Da bi bot čitao poruke iz kanala, morate ga dodati u svaki kanal:
1. Otvorite kanal u Slack-u
2. Ukucajte `/invite @ImeBota`
3. Potvrdite

## 6. Provera statusa

U Settings > Slack treba da vidite:
- ✅ Povezan
- Naziv workspace-a
- Broj povezanih kanala

## NAPOMENE

- Socket Mode ne zahteva javni URL
- Ako imate probleme sa Socket Mode-om, proverite da li je token ispravan
- Bot će automatski kreirati kontakte iz svakog pošiljaoca
