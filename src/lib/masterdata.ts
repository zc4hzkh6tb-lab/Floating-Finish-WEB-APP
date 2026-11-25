import { prisma } from "./db";
import type { PackageInfo } from "./booking";

export type AddonInfo = { code: string; name: string; description: string | null; priceHint: string | null; isLedWall: boolean };
export type MasterData = {
  series: { code: string; name: string }[];
  packages: PackageInfo[];
  addonCategories: { code: string; name: string; addons: AddonInfo[] }[];
};

export async function loadMasterData(): Promise<MasterData> {
  const [series, packages, categories] = await Promise.all([
    prisma.series.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { includedAddons: { include: { addon: true } } },
    }),
    prisma.addonCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { addons: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
  ]);
  return {
    series: series.map((s) => ({ code: s.code, name: s.name })),
    packages: packages.map((p) => ({
      code: p.code,
      name: p.name,
      description: p.description,
      priceCategory: p.priceCategory,
      maxPerspectives: p.maxPerspectives,
      maxSpeakers: p.maxSpeakers,
      includedAddonCodes: p.includedAddons.map((ia) => ia.addon.code),
    })),
    addonCategories: categories.map((c) => ({
      code: c.code,
      name: c.name,
      addons: c.addons.map((a) => ({ code: a.code, name: a.name, description: a.description, priceHint: a.priceHint, isLedWall: a.isLedWall })),
    })),
  };
}
