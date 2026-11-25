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

async function main() {
  for (const [i, [code, name]] of series.entries()) {
    await prisma.series.upsert({ where: { code }, update: { name, sortOrder: i }, create: { code, name, sortOrder: i, note: "Zeitnahme über Serie hinterlegt" } });
  }
  for (const [i, [code, name]] of categories.entries()) {
    await prisma.addonCategory.upsert({ where: { code }, update: { name, sortOrder: i }, create: { code, name, sortOrder: i } });
  }
  for (const [i, [code, name, cat, isLedWall]] of addons.entries()) {
    const category = await prisma.addonCategory.findUniqueOrThrow({ where: { code: cat } });
    await prisma.addon.upsert({
      where: { code },
      update: { name, categoryId: category.id, isLedWall, sortOrder: i },
      create: { code, name, categoryId: category.id, isLedWall, sortOrder: i },
    });
  }
  for (const [i, p] of packages.entries()) {
    const { included, ...data } = p;
    const pkg = await prisma.package.upsert({ where: { code: p.code }, update: { ...data, sortOrder: i }, create: { ...data, sortOrder: i } });
    await prisma.packageAddon.deleteMany({ where: { packageId: pkg.id } });
    for (const code of included) {
      const addon = await prisma.addon.findUniqueOrThrow({ where: { code } });
      await prisma.packageAddon.create({ data: { packageId: pkg.id, addonId: addon.id } });
    }
  }
}

main().finally(() => prisma.$disconnect());
