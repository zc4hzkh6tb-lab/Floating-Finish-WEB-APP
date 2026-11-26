import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const series = [
  ["DTTO", "DTTO"],
  ["NTTM", "NTTM"],
  ["ETPC", "ETPC"],
  ["GP", "GP (Gardenpulling)"],
  ["ATPI", "ATPI (Italien)"],
];

const categories = [
  ["LED", "LED-Wand"],
  ["KAMERA", "Zusätzliche Kameras"],
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
    for (const [i, [code, name]] of categories.entries()) {
      await prisma.addonCategory.create({ data: { code, name, sortOrder: i } });
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
}

main().finally(() => prisma.$disconnect());
