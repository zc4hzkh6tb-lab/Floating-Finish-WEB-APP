import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const series = [
  ["DTTO", "DTTO"],
  ["NTTM", "NTTM"],
  ["ETPC", "ETPC"],
  ["GP", "GP (Gardenpulling)"],
  ["ATPI", "ATPI (Italien)"],
];

const categories: [string, string, "LED" | "KAMERA" | "ADDON" | "SONSTIGES"][] = [
  ["LED", "LED-Wand", "LED"],
  ["KAMERA", "Zusätzliche Kameras", "KAMERA"],
];

// [code, name, category, isLedWall]
const addons: [string, string, string, boolean][] = [
  ["LED_WALL", "LED-Wand", "LED", true],
  ["LED_STREAM", "Bespielung LED-Wand mit Stream", "LED", false],
  ["LED_STREAM_ADS", "Bespielung mit Stream und eigener Werbung", "LED", false],
  ["LED_OWN_MIX", "LED mit eigener Mischung", "LED", false],
  ["CAM_MOBILE_DRONE", "Mobilkamera & Drohne im Wechsel (eine Person)", "KAMERA", false],
  ["CAM_MOBILE_FULL", "Mobilkamera fulltime", "KAMERA", false],
  ["CAM_DRONE_FULL", "Drohne fulltime", "KAMERA", false],
  ["CAM_ERDWALL_MANNED", "Erdwallkamera bemannt", "KAMERA", false],
  ["PTZ_ERDWALL", "Zusätzliche PTZ am Erdwall", "KAMERA", false],
  ["PTZ_START", "Zusätzliche PTZ am Start", "KAMERA", false],
  ["PTZ_ANY", "PTZ an beliebiger Stelle", "KAMERA", false],
  ["CAM_LEAD_RAISED", "Höher gelegte Führungskamera", "KAMERA", false],
  ["CAM_CRANE", "Kamerakran", "KAMERA", false],
  ["CAM_ONBOARD", "Onboard-Aufnahmen", "KAMERA", false],
  ["CAM_SLED", "Bremswagenkamera", "KAMERA", false],
  ["CAM_FIXED", "Feste Perspektive (beliebig)", "KAMERA", false],
];

// PLATZHALTER – die echten Pakete besprechen wir noch
const packages = [
  { code: "BASIS", name: "Basis", description: "Platzhalter: kleiner Stream mit wenigen Perspektiven", priceCategory: "€", maxPerspectives: 2, maxSpeakers: 1, included: [] as string[] },
  { code: "STANDARD", name: "Standard", description: "Platzhalter: typische VA mit mehreren Perspektiven", priceCategory: "€€", maxPerspectives: 4, maxSpeakers: 2, included: ["PTZ_START"] },
  { code: "PREMIUM", name: "Premium", description: "Platzhalter: große VA, volle Abdeckung", priceCategory: "€€€", maxPerspectives: null, maxSpeakers: null, included: ["PTZ_START", "PTZ_ERDWALL", "CAM_MOBILE_DRONE"] },
];

// BEISPIELE – im Backoffice unter Stammdaten anpassbar
const classes = ["3,5 t Standard", "3,5 t Sport", "4,5 t Standard", "4,5 t Sport", "6 t Sport", "8 t Sport", "Garden Pulling"];
const ledSizes = ["3 × 2 m", "4 × 2,5 m", "5 × 3 m", "6 × 3,5 m"];
const seriesColors: Record<string, string> = { DTTO: "#ef4444", NTTM: "#f97316", ETPC: "#3b82f6", GP: "#22c55e", ATPI: "#a855f7" };

// Startdaten nur anlegen, wenn die jeweilige Tabelle leer ist.
// So überschreibt ein neuer Deploy keine Änderungen aus dem Backoffice.
async function main() {
  if ((await prisma.series.count()) === 0) {
    for (const [i, [code, name]] of series.entries()) {
      await prisma.series.create({ data: { code, name, sortOrder: i, color: seriesColors[code] ?? "#f59e0b", note: "Zeitnahme über Serie hinterlegt" } });
    }
  }
  if ((await prisma.vehicleClass.count()) === 0) {
    await prisma.vehicleClass.createMany({ data: classes.map((name, i) => ({ name, sortOrder: i })) });
  }
  if ((await prisma.ledSize.count()) === 0) {
    await prisma.ledSize.createMany({ data: ledSizes.map((label, i) => ({ label, sortOrder: i })) });
  }
  if ((await prisma.addonCategory.count()) === 0) {
    for (const [i, [code, name, group]] of categories.entries()) {
      await prisma.addonCategory.create({ data: { code, name, group, sortOrder: i } });
    }
  }
  if ((await prisma.addon.count()) === 0) {
    for (const [i, [code, name, cat, isLedWall]] of addons.entries()) {
      const category = await prisma.addonCategory.findUniqueOrThrow({ where: { code: cat } });
      await prisma.addon.create({ data: { code, name, categoryId: category.id, isLedWall, sortOrder: i } });
    }
  }
  if ((await prisma.package.count()) === 0) {
    for (const [i, p] of packages.entries()) {
      const { included, ...data } = p;
      const pkg = await prisma.package.create({ data: { ...data, sortOrder: i } });
      for (const code of included) {
        const addon = await prisma.addon.findUnique({ where: { code } });
        if (addon) await prisma.packageAddon.create({ data: { packageId: pkg.id, addonId: addon.id } });
      }
    }
  }
  await seedV3();
}

// ---------- BEISPIELE Runde 3 (alles im Backoffice änderbar) ----------
async function once(key: string, fn: () => Promise<void>) {
  if (await prisma.setting.findUnique({ where: { key } })) return;
  await fn();
  await prisma.setting.create({ data: { key, value: new Date().toISOString() } });
}
async function ifEmpty(count: () => Promise<number>, fn: () => Promise<void>) {
  if ((await count()) === 0) await fn();
}

async function seedV3() {
  await once("seed_v3_addons", async () => {
    const extra: [string, string, "ADDON" | "SONSTIGES", [string, string, string, number][]][] = [
      ["STREAM_EXTRAS", "Stream-Extras", "ADDON", [
        ["GFX_SPONSOR", "Sponsoren- und Werbeeinblendungen", "ab 150 € / Tag", 150],
        ["GFX_RESULTS", "Live-Ergebnisse und Grafiken", "ab 200 € / Tag", 200],
        ["VOD_DOWNLOAD", "Aufzeichnung zum Download", "ab 100 € / Tag", 100],
        ["STREAM_SECOND", "Zweiter Streamkanal (z. B. YouTube und Facebook)", "ab 80 € / Tag", 80],
      ]],
      ["PERSONAL_EXTRAS", "Sprecher, Interviews & mehr", "SONSTIGES", [
        ["SPEAKER_EXTRA", "Zusätzlicher Sprecher", "ab 250 € / Tag", 250],
        ["INTERVIEWS", "Interviews im Fahrerlager", "ab 200 € / Tag", 200],
        ["HIGHLIGHT_CLIP", "Highlight-Clip nach der VA", "ab 300 €", 300],
        ["SOCIAL_MEDIA", "Social-Media-Betreuung vor Ort", "ab 250 € / Tag", 250],
      ]],
    ];
    const base = await prisma.addonCategory.count();
    for (const [i, [code, name, group, items]] of extra.entries()) {
      if (await prisma.addonCategory.findUnique({ where: { code } })) continue;
      const cat = await prisma.addonCategory.create({ data: { code, name, group, sortOrder: base + i } });
      for (const [j, [acode, aname, hint, price]] of items.entries()) {
        if (!(await prisma.addon.findUnique({ where: { code: acode } }))) await prisma.addon.create({ data: { code: acode, name: aname, priceHint: hint, price, categoryId: cat.id, sortOrder: 100 + j } });
      }
    }
    // Beispielpreise für bestehende Add-ons und Pakete (nur wo noch leer)
    const prices: Record<string, number> = { LED_WALL: 900, LED_STREAM: 150, LED_STREAM_ADS: 250, LED_OWN_MIX: 400, CAM_MOBILE_DRONE: 450, CAM_MOBILE_FULL: 350, CAM_DRONE_FULL: 450, CAM_ERDWALL_MANNED: 350, PTZ_ERDWALL: 180, PTZ_START: 180, PTZ_ANY: 200, CAM_LEAD_RAISED: 250, CAM_CRANE: 600, CAM_ONBOARD: 150, CAM_SLED: 200, CAM_FIXED: 150 };
    for (const [code, price] of Object.entries(prices)) await prisma.addon.updateMany({ where: { code, price: null }, data: { price } });
    for (const [code, price] of Object.entries({ BASIS: 1200, STANDARD: 2200, PREMIUM: 3500 })) await prisma.package.updateMany({ where: { code, price: null }, data: { price } });
  });

  await ifEmpty(() => prisma.ledPlayoutOption.count(), async () => {
    const opts: [string, string, string, string | null][] = [
      ["NONE", "Keine LED-Wand", "Es wird keine LED-Wand bespielt.", null],
      ["STREAM", "Bespielung mit dem Stream", "Auf der Wand läuft das Livebild, so wie es auch im Stream zu sehen ist.", "LED_STREAM"],
      ["STREAM_ADS", "Stream und eigene Werbung", "Livebild plus Ihre Sponsoren- und Werbeclips in den Pausen.", "LED_STREAM_ADS"],
      ["OWN_MIX", "Eigene Mischung für die Wand", "Ein eigenes Programm nur für die Zuschauer vor Ort, unabhängig vom Stream.", "LED_OWN_MIX"],
    ];
    for (const [i, [code, name, description, addonCode]] of opts.entries()) {
      const addon = addonCode ? await prisma.addon.findUnique({ where: { code: addonCode } }) : null;
      await prisma.ledPlayoutOption.create({ data: { code, name, description, addonId: addon?.id, sortOrder: i } });
    }
  });

  await ifEmpty(() => prisma.bookingRule.count(), async () => {
    const standard = await prisma.package.findUnique({ where: { code: "STANDARD" } });
    await prisma.bookingRule.create({ data: { name: "DTTO braucht mindestens Standard", type: "MIN_PACKAGE", seriesCodes: ["DTTO"], matchAll: false, packageId: standard?.id, message: "Für Läufe der DTTO ist mindestens das Paket Standard nötig.", sortOrder: 0 } });
    await prisma.bookingRule.create({ data: { name: "DTTO + NTTM + ETPC nur mit eigenem Angebot", type: "CUSTOM_OFFER", seriesCodes: ["DTTO", "NTTM", "ETPC"], matchAll: true, message: "DTTO, NTTM und ETPC an einer Veranstaltung übersteigen unsere größte Anlage. Dafür erstellen wir ein eigenes Angebot.", sortOrder: 1 } });
  });

  await ifEmpty(() => prisma.qualification.count(), async () => {
    await prisma.qualification.createMany({ data: ["Drohnenführerschein A1/A3", "Drohnenführerschein A2", "Elektrofachkraft", "Erste Hilfe", "Bildmischung", "Kommentator", "Arbeiten in der Höhe"].map((name, i) => ({ name, sortOrder: i })) });
  });
  await ifEmpty(() => prisma.licenseClass.count(), async () => {
    await prisma.licenseClass.createMany({ data: ["B", "BE", "C1", "C1E", "C", "CE"].map((name, i) => ({ name, sortOrder: i })) });
  });
  await ifEmpty(() => prisma.position.count(), async () => {
    await prisma.position.createMany({ data: ["Regie", "Bildmischer", "Kamera", "Kamera Erdwall", "Drohnenpilot", "Sprecher", "Streaming-Technik", "LED-Technik", "Auf- und Abbau"].map((name, i) => ({ name, sortOrder: i })) });
  });

  await ifEmpty(() => prisma.article.count(), async () => {
    const cats = ["Kameras", "Stative & Halterungen", "Regie & Bildmischer", "Audio", "Netzwerk & Streaming", "Kabel", "Strom", "LED-Wand", "Transport"];
    const catId: Record<string, string> = {};
    for (const [i, name] of cats.entries()) catId[name] = (await prisma.articleCategory.upsert({ where: { name }, update: {}, create: { name, sortOrder: i } })).id;
    // [Name, Kategorie, Art, Bestand, Kunde sieht, Lagerort]
    const arts: [string, string, "GERAET" | "ZUBEHOER" | "KABEL" | "VERBRAUCH", number, boolean, string][] = [
      ["PTZ-Kamera (Beispiel)", "Kameras", "GERAET", 6, true, "Regal A1"],
      ["Kamera bemannt mit Teleobjektiv (Beispiel)", "Kameras", "GERAET", 3, true, "Regal A2"],
      ["Drohne mit Kamera (Beispiel)", "Kameras", "GERAET", 1, true, "Case D1"],
      ["Actioncam Onboard (Beispiel)", "Kameras", "GERAET", 4, true, "Regal A3"],
      ["Videostativ", "Stative & Halterungen", "ZUBEHOER", 6, false, "Regal B1"],
      ["Mast für Führungskamera", "Stative & Halterungen", "ZUBEHOER", 1, false, "Halle"],
      ["Bildmischer (Beispiel)", "Regie & Bildmischer", "GERAET", 2, true, "Regiecase 1"],
      ["Regie-Monitor", "Regie & Bildmischer", "GERAET", 4, false, "Regiecase 1"],
      ["Grafik-Notebook", "Regie & Bildmischer", "GERAET", 2, false, "Regiecase 2"],
      ["Kommentatoren-Headset", "Audio", "GERAET", 4, true, "Audiocase"],
      ["Audiomischpult", "Audio", "GERAET", 1, false, "Audiocase"],
      ["Streaming-Encoder", "Netzwerk & Streaming", "GERAET", 2, false, "Regiecase 2"],
      ["Mobilfunk-Bonding-Router", "Netzwerk & Streaming", "GERAET", 2, true, "Netzwerkcase"],
      ["Satelliten-Internet (Beispiel)", "Netzwerk & Streaming", "GERAET", 1, true, "Netzwerkcase"],
      ["SDI-Kabel 50 m", "Kabel", "KABEL", 20, false, "Kabelwand"],
      ["SDI-Kabel 100 m", "Kabel", "KABEL", 10, false, "Kabelwand"],
      ["Netzwerkkabel 100 m", "Kabel", "KABEL", 10, false, "Kabelwand"],
      ["BNC-Adapter-Set", "Kabel", "ZUBEHOER", 5, false, "Kleinteile"],
      ["Stromkabel 25 m", "Strom", "KABEL", 15, false, "Kabelwand"],
      ["Stromverteiler", "Strom", "GERAET", 4, false, "Halle"],
      ["LED-Wand 4 × 2,5 m (Beispiel)", "LED-Wand", "GERAET", 1, true, "Anhänger"],
      ["LED-Prozessor", "LED-Wand", "GERAET", 2, false, "LED-Case"],
      ["Ballast / Ständerung LED", "LED-Wand", "ZUBEHOER", 1, false, "Anhänger"],
      ["Transportcase groß", "Transport", "ZUBEHOER", 6, false, "Halle"],
      ["Gaffa-Tape", "Transport", "VERBRAUCH", 20, false, "Kleinteile"],
    ];
    const id: Record<string, string> = {};
    for (const [name, cat, kind, quantity, customerVisible, storage] of arts) id[name] = (await prisma.article.create({ data: { name, categoryId: catId[cat], kind, quantity, customerVisible, storage } })).id;
    const rigs: [string, string, string, [string, number][]][] = [
      ["Anlage klein", "BASIS", "Kompakte Regie mit zwei Perspektiven und einem Sprecherplatz.", [["PTZ-Kamera (Beispiel)", 2], ["Bildmischer (Beispiel)", 1], ["Kommentatoren-Headset", 1], ["Streaming-Encoder", 1], ["Mobilfunk-Bonding-Router", 1], ["SDI-Kabel 100 m", 2], ["Netzwerkkabel 100 m", 1], ["Stromkabel 25 m", 3], ["Stromverteiler", 1], ["Regie-Monitor", 1], ["Videostativ", 2], ["BNC-Adapter-Set", 1]]],
      ["Anlage mittel", "STANDARD", "Regie mit bis zu vier Perspektiven, zwei Sprecherplätzen und Grafik.", [["PTZ-Kamera (Beispiel)", 3], ["Kamera bemannt mit Teleobjektiv (Beispiel)", 1], ["Bildmischer (Beispiel)", 1], ["Grafik-Notebook", 1], ["Kommentatoren-Headset", 2], ["Streaming-Encoder", 1], ["Mobilfunk-Bonding-Router", 1], ["SDI-Kabel 100 m", 4], ["Netzwerkkabel 100 m", 2], ["Stromkabel 25 m", 5], ["Stromverteiler", 2], ["Regie-Monitor", 2], ["Videostativ", 4], ["BNC-Adapter-Set", 1]]],
      ["Anlage groß", "PREMIUM", "Volle Abdeckung mit bemannten Kameras, Drohne und Grafik.", [["PTZ-Kamera (Beispiel)", 4], ["Kamera bemannt mit Teleobjektiv (Beispiel)", 2], ["Drohne mit Kamera (Beispiel)", 1], ["Bildmischer (Beispiel)", 1], ["Grafik-Notebook", 1], ["Kommentatoren-Headset", 3], ["Audiomischpult", 1], ["Streaming-Encoder", 2], ["Mobilfunk-Bonding-Router", 1], ["Satelliten-Internet (Beispiel)", 1], ["SDI-Kabel 100 m", 6], ["SDI-Kabel 50 m", 4], ["Netzwerkkabel 100 m", 3], ["Stromkabel 25 m", 8], ["Stromverteiler", 3], ["Regie-Monitor", 3], ["Videostativ", 6], ["Mast für Führungskamera", 1], ["BNC-Adapter-Set", 2]]],
    ];
    for (const [i, [name, pkgCode, text, items]] of rigs.entries()) {
      const rig = await prisma.rig.create({ data: { name, customerDescription: text, sortOrder: i, items: { create: items.map(([a, quantity]) => ({ articleId: id[a], quantity, customerVisible: arts.find((x) => x[0] === a)![4] })) } } });
      await prisma.package.updateMany({ where: { code: pkgCode, rigId: null }, data: { rigId: rig.id } });
    }
    const addonMat: Record<string, [string, number][]> = {
      PTZ_START: [["PTZ-Kamera (Beispiel)", 1], ["SDI-Kabel 100 m", 1], ["Stromkabel 25 m", 1]],
      PTZ_ERDWALL: [["PTZ-Kamera (Beispiel)", 1], ["SDI-Kabel 100 m", 2], ["Stromkabel 25 m", 1]],
      CAM_DRONE_FULL: [["Drohne mit Kamera (Beispiel)", 1]],
      CAM_ONBOARD: [["Actioncam Onboard (Beispiel)", 2]],
      LED_WALL: [["LED-Wand 4 × 2,5 m (Beispiel)", 1], ["LED-Prozessor", 1], ["Ballast / Ständerung LED", 1], ["Stromkabel 25 m", 2], ["SDI-Kabel 100 m", 1]],
      SPEAKER_EXTRA: [["Kommentatoren-Headset", 1]],
    };
    for (const [code, items] of Object.entries(addonMat)) {
      const addon = await prisma.addon.findUnique({ where: { code } });
      if (addon) await prisma.addonArticle.createMany({ data: items.map(([a, quantity]) => ({ addonId: addon.id, articleId: id[a], quantity, customerVisible: arts.find((x) => x[0] === a)![4] })) });
    }
  });

  await ifEmpty(() => prisma.organizer.count(), async () => {
    await prisma.organizer.create({ data: { name: "Beispiel Pulling Team e.V.", contactName: "Max Beispiel", email: "kontakt@example.com", phone: "+49 000 000000", street: "Vereinsweg 1", zip: "12345", city: "Musterdorf", country: "Deutschland", notes: "Beispieldatensatz – bitte ändern oder löschen." } });
  });
  await ifEmpty(() => prisma.location.count(), async () => {
    await prisma.location.create({ data: { name: "Beispiel-Pullingbahn Musterdorf", street: "Am Festplatz 1", zip: "12345", city: "Musterdorf", country: "Deutschland", power: "2 × 32 A CEE am Regieplatz, 16 A an der Bahn (Beispiel)", internet: "Kein Festnetz, gute LTE-Abdeckung (Beispiel)", trackInfo: "Bahn 100 m, Erdwall rechts, Regieplatz hinter dem Ziel (Beispiel)", notes: "Beispieldatensatz – bitte ändern oder löschen." } });
  });

  await ifEmpty(() => prisma.planSymbol.count(), async () => {
    const syms: [string, string, string, string][] = [
      ["Kamera bemannt", "🎥", "#ef4444", "POINT"],
      ["PTZ-Kamera", "📹", "#f97316", "POINT"],
      ["Drohne", "🚁", "#8b5cf6", "POINT"],
      ["Regie", "🎛️", "#0ea5e9", "POINT"],
      ["Sprecher", "🎙️", "#14b8a6", "POINT"],
      ["LED-Wand", "🖥️", "#eab308", "POINT"],
      ["Strom", "⚡", "#dc2626", "POINT"],
      ["Internet / Router", "📡", "#22c55e", "POINT"],
      ["Start", "🏁", "#525252", "POINT"],
      ["SDI-Kabel", "–", "#2563eb", "LINE"],
      ["Netzwerkkabel", "–", "#16a34a", "LINE"],
      ["Stromkabel", "–", "#dc2626", "LINE"],
      ["Bahn / Absperrung", "–", "#737373", "LINE"],
    ];
    await prisma.planSymbol.createMany({ data: syms.map(([name, icon, color, kind], i) => ({ name, icon, color, kind, sortOrder: i })) });
  });

  await ifEmpty(() => prisma.checklistTemplate.count(), async () => {
    await prisma.checklistTemplate.createMany({
      data: [
        { name: "Vor der Abfahrt", sortOrder: 0, items: ["Materialliste gepackt und abgehakt", "Akkus geladen", "Drohnen-Genehmigung geprüft", "Stream-Zugang beim Veranstalter getestet", "Fahrzeug getankt und Anhänger geprüft"] },
        { name: "Aufbau vor Ort", sortOrder: 1, items: ["Regieplatz und Strom mit Veranstalter abgestimmt", "Kabelwege gesichert", "Kameras aufgebaut und ausgerichtet", "Internet-Speedtest gemacht", "Testlauf Stream (privat)", "Sprecherplatz getestet", "LED-Wand angeschlossen und getestet"] },
        { name: "Abbau", sortOrder: 2, items: ["Stream beendet und Aufzeichnung gesichert", "Alle Kabel eingesammelt", "Material vollständig nach Liste", "Schäden notiert"] },
      ],
    });
  });

  await ifEmpty(() => prisma.chatChannel.count({ where: { bookingId: null } }), async () => {
    await prisma.chatChannel.create({ data: { name: "Allgemein" } });
  });
}

main().finally(() => prisma.$disconnect());
