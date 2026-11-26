import { prisma } from "./db";
import type { PackageInfo } from "./booking";

export type AddonInfo = { code: string; name: string; description: string | null; priceHint: string | null; isLedWall: boolean };
export type QuestionInfo = { id: string; label: string; help: string | null; type: "TEXT" | "NUMBER" | "YESNO" | "SELECT"; options: string[]; required: boolean };
export type MasterData = {
  series: { code: string; name: string; color: string }[];
  classes: string[];
  ledSizes: string[];
  questions: QuestionInfo[];
  packages: PackageInfo[];
  addonCategories: { code: string; name: string; addons: AddonInfo[] }[];
};

export async function loadMasterData(): Promise<MasterData> {
  const [series, packages, categories, classes, ledSizes, questions] = await Promise.all([
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
    prisma.vehicleClass.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.ledSize.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.customQuestion.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
  ]);
  return {
    series: series.map((s) => ({ code: s.code, name: s.name, color: s.color })),
    classes: classes.map((c) => c.name),
    ledSizes: ledSizes.map((l) => l.label),
    questions: questions.map((q) => ({ id: q.id, label: q.label, help: q.help, type: q.type, options: q.options, required: q.required })),
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
