import { prisma } from "./db";
import type { PackageInfo, RuleInfo } from "./booking";
import { getSettings } from "./settings";

export type AddonInfo = { code: string; name: string; description: string | null; priceHint: string | null; isLedWall: boolean };
export type QuestionInfo = { id: string; label: string; help: string | null; type: "TEXT" | "NUMBER" | "YESNO" | "SELECT"; options: string[]; required: boolean };
export type MasterData = {
  series: { code: string; name: string; color: string }[];
  classes: string[];
  ledSizes: string[];
  questions: QuestionInfo[];
  packages: PackageInfo[];
  addonCategories: { code: string; name: string; group: "KAMERA" | "ADDON" | "SONSTIGES" | "LED"; addons: AddonInfo[] }[];
  rules: RuleInfo[];
  ledPlayouts: { code: string; name: string; description: string | null; addonCode: string | null }[];
  texts: { ledNote: string; customOfferNote: string };
};

export async function loadMasterData(): Promise<MasterData> {
  const [series, packages, categories, classes, ledSizes, questions, rules, playouts, settings] = await Promise.all([
    prisma.series.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: {
        includedAddons: { include: { addon: true } },
        excludedAddons: { include: { addon: true } },
        rig: { include: { items: { where: { customerVisible: true }, include: { article: true } } } },
      },
    }),
    prisma.addonCategory.findMany({
      orderBy: { sortOrder: "asc" },
      include: { addons: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.vehicleClass.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.ledSize.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    prisma.customQuestion.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] }),
    prisma.bookingRule.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { package: true } }),
    prisma.ledPlayoutOption.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, include: { addon: true } }),
    getSettings(),
  ]);
  return {
    series: series.map((s) => ({ code: s.code, name: s.name, color: s.color })),
    classes: classes.map((c) => c.name),
    ledSizes: ledSizes.map((l) => l.label),
    questions: questions.map((q) => ({ id: q.id, label: q.label, help: q.help, type: q.type, options: q.options, required: q.required })),
    packages: packages.map((p) => ({
      code: p.code,
      sortOrder: p.sortOrder,
      customerItems: p.rig?.items.map((i) => (i.quantity > 1 ? `${i.quantity} × ${i.article.name}` : i.article.name)) ?? [],
      rigText: p.rig?.customerDescription ?? null,
      name: p.name,
      description: p.description,
      priceCategory: p.priceCategory,
      maxPerspectives: p.maxPerspectives,
      maxSpeakers: p.maxSpeakers,
      includedAddonCodes: p.includedAddons.map((ia) => ia.addon.code),
      excludedAddonCodes: p.excludedAddons.map((ea) => ea.addon.code),
    })),
    addonCategories: categories.map((c) => ({
      code: c.code,
      name: c.name,
      group: c.group,
      addons: c.addons.map((a) => ({ code: a.code, name: a.name, description: a.description, priceHint: a.priceHint, isLedWall: a.isLedWall })),
    })),
    rules: rules.map((r) => ({ type: r.type, seriesCodes: r.seriesCodes, matchAll: r.matchAll, packageCode: r.package?.code ?? null, message: r.message })),
    ledPlayouts: playouts.map((o) => ({ code: o.code, name: o.name, description: o.description, addonCode: o.addon?.active ? o.addon.code : null })),
    texts: { ledNote: settings.led_hinweis, customOfferNote: settings.eigenes_angebot_hinweis },
  };
}
