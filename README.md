# Floating Finish

Buchungstool, Backoffice und (später) Team-App für Livestreams von Tractor-Pulling-Veranstaltungen.

## Stand: Stufe 1

- `/buchen` – Buchungsstrecke für Kunden: Veranstaltung → Grundsetup → Add-ons (je Tag buchbar) → LED-Wand (nur bei Buchung der Wand) → Zusammenfassung → Anfrage
- `/backoffice` – Liste und Detailansicht der Anfragen (vorläufig per Benutzer/Passwort geschützt)
- Stammdaten (Serien, Pakete, Add-ons) in der Datenbank, Startwerte in `prisma/seed.ts`

**Platzhalter:** Pakete (Basis/Standard/Premium), LED-Wand-Größen, Richtpreise und die „vor Ort benötigt“-Hinweise sind vorläufig.

## Login und Rollen

- `/login` für Backoffice und Team-App. Beim allerersten Login (noch keine Nutzer) wird mit `BACKOFFICE_USER` / `BACKOFFICE_PASSWORD` automatisch ein Admin angelegt.
- Rollen: **Admin** (alles inkl. Nutzerverwaltung), **Planung** (Backoffice), **Team** (nur Team-App unter `/app`).
- Empfohlen: `AUTH_SECRET` (lange Zufallszeichenkette) als Umgebungsvariable setzen.

## Lokal starten

Voraussetzung: Node.js 20+ und eine PostgreSQL-Datenbank.

```bash
cp .env.example .env        # DATABASE_URL und Backoffice-Zugang eintragen
npm install
npx prisma migrate deploy
npm run db:seed
npm run dev
```

Dann http://localhost:3000 öffnen.

## Tech

Next.js 15 (App Router, TypeScript), Tailwind CSS 4, Prisma 6 mit PostgreSQL (später Supabase), Zod.

## Test-Deployment (Vercel + Supabase, kostenlos)

**Einfachster Weg:** Im Vercel-Projekt unter **Storage → Create Database → Supabase** eine Datenbank verbinden. Vercel setzt die Zugangsdaten dann selbst, `DATABASE_URL` wird nicht gebraucht. Danach Backoffice-Variablen setzen und neu deployen.

Alternativ manuell:

1. Auf supabase.com ein Projekt anlegen (Region Frankfurt). Unter **Connect** den Connection String „Session pooler“ kopieren und das Datenbank-Passwort einsetzen.
2. Auf vercel.com mit GitHub anmelden, dieses Repository importieren und unter **Environment Variables** eintragen:
   - `DATABASE_URL` – der Connection String aus Schritt 1
   - `BACKOFFICE_USER` und `BACKOFFICE_PASSWORD` – Zugang fürs Backoffice
3. **Deploy** klicken. Beim Build laufen automatisch die Datenbank-Migrationen und die Startdaten (`vercel-build`).

## Backoffice-Module (Stand 27.11.2026)

- **Aufträge:** Anfragen mit Angeboten (Druckansicht/PDF), Materialliste aus Paket-Anlage und Add-on-Material, Checklisten, Aufbauplänen und Projekt-Chat. Schnellanfrage intern (`/backoffice/schnellanfrage`) und öffentlich (`/buchen/schnell`).
- **Lager & Technik:** Inventar mit Einzelgeräten (Serien-/Inventarnummer, Status), Anlagen aus Inventar mit „Kunde sieht“ je Position, Material je Add-on.
- **Personal:** Personalakte mit Adresse, Geburtsdatum, Positionen, Qualifikationen, Führerscheinen.
- **Buchungstool:** Pakete (Anlage, interner Preis), Add-ons in Bereichen (Kameras / Add-ons / Sonstiges / LED), Regeln (Mindestpaket je Serie, Kombination → eigenes Angebot), LED-Bespielung.
- **Auswertungen** nach Jahr und Serie; **Einstellungen** für Firmendaten und Buchungstexte.

Alle Beispieldaten legt der Seed nur einmal an (leere Tabellen bzw. Merker in `Setting`). Danach gilt, was im Backoffice gepflegt wird.
