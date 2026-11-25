# Floating Finish

Buchungstool, Backoffice und (später) Team-App für Livestreams von Tractor-Pulling-Veranstaltungen.

## Stand: Stufe 1

- `/buchen` – Buchungsstrecke für Kunden: Veranstaltung → Grundsetup → Add-ons (je Tag buchbar) → LED-Wand (nur bei Buchung der Wand) → Zusammenfassung → Anfrage
- `/backoffice` – Liste und Detailansicht der Anfragen (vorläufig per Benutzer/Passwort geschützt)
- Stammdaten (Serien, Pakete, Add-ons) in der Datenbank, Startwerte in `prisma/seed.ts`

**Platzhalter:** Pakete (Basis/Standard/Premium), LED-Wand-Größen, Richtpreise und die „vor Ort benötigt“-Hinweise sind vorläufig.

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
