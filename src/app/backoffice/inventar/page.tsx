import Link from "next/link";
import type { ArticleKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ARTICLE_KIND } from "@/lib/labels";
import { saveArticle } from "../lager-actions";
import { Card, L, NewTitle, Page, SaveButton } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Inventar" };

export default async function InventarPage({ searchParams }: { searchParams: Promise<{ q?: string; cat?: string; kind?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.ArticleWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { number: { contains: sp.q, mode: "insensitive" } }, { manufacturer: { contains: sp.q, mode: "insensitive" } }, { units: { some: { serial: { contains: sp.q, mode: "insensitive" } } } }] } : {}),
    ...(sp.cat ? { categoryId: sp.cat } : {}),
    ...(sp.kind ? { kind: sp.kind as ArticleKind } : {}),
  };
  const [articles, categories] = await Promise.all([
    prisma.article.findMany({ where, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }], include: { category: true, units: { select: { status: true } }, _count: { select: { rigItems: true } } } }),
    prisma.articleCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  return (
    <Page title="Inventar" intro="Alle Geräte, Kabel und Zubehörteile. Einzelne Geräte mit Seriennummer pflegst du im Artikel. Artikel fließen in Anlagen, Add-ons und Materiallisten.">
      <form className="flex flex-wrap items-end gap-3">
        <L label="Suche (Name, Nr., Hersteller, Seriennr.)" className="min-w-56 flex-1"><input name="q" defaultValue={sp.q} className="input" /></L>
        <L label="Kategorie">
          <select name="cat" defaultValue={sp.cat ?? ""} className="input"><option value="">alle</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
        </L>
        <L label="Art">
          <select name="kind" defaultValue={sp.kind ?? ""} className="input"><option value="">alle</option>{Object.entries(ARTICLE_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        </L>
        <button className="btn-ghost">Filtern</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs text-neutral-400">
            <tr><th className="p-2">Artikel</th><th className="p-2">Kategorie</th><th className="p-2">Art</th><th className="p-2 text-right">Bestand</th><th className="p-2">Geräte</th><th className="p-2">Lagerort</th><th className="p-2">Kunde sieht</th></tr>
          </thead>
          <tbody>
            {articles.map((a) => {
              const defect = a.units.filter((u) => u.status === "DEFEKT" || u.status === "REPARATUR").length;
              return (
                <tr key={a.id} className={`border-t border-neutral-800 ${a.active ? "" : "opacity-50"}`}>
                  <td className="p-2"><Link href={`/backoffice/inventar/${a.id}`} className="font-medium text-amber-400 hover:underline">{a.name}</Link>{a.number && <span className="ml-2 text-xs text-neutral-500">{a.number}</span>}<div className="text-xs text-neutral-500">{[a.manufacturer, a.model].filter(Boolean).join(" ")}</div></td>
                  <td className="p-2">{a.category?.name ?? "–"}</td>
                  <td className="p-2">{ARTICLE_KIND[a.kind]}</td>
                  <td className="p-2 text-right">{a.quantity} {a.unit}</td>
                  <td className="p-2">{a.units.length ? `${a.units.length} erfasst` : "–"}{defect > 0 && <span className="ml-1 rounded bg-red-900/60 px-1.5 text-xs text-red-300">{defect} defekt</span>}</td>
                  <td className="p-2">{a.storage ?? "–"}</td>
                  <td className="p-2">{a.customerVisible ? "ja" : "–"}</td>
                </tr>
              );
            })}
            {articles.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-neutral-500">Keine Artikel gefunden.</td></tr>}
          </tbody>
        </table>
      </div>
      <Card>
        <NewTitle>Neuer Artikel</NewTitle>
        <form action={saveArticle} className="grid gap-3 sm:grid-cols-4">
          <L label="Name" className="sm:col-span-2"><input name="name" className="input" required /></L>
          <L label="Kategorie"><select name="categoryId" className="input"><option value="">–</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
          <L label="Art"><select name="kind" className="input">{Object.entries(ARTICLE_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></L>
          <L label="Bestand"><input name="quantity" type="number" defaultValue={1} className="input" /></L>
          <L label="Einheit"><input name="unit" defaultValue="Stk" className="input" /></L>
          <L label="Hersteller"><input name="manufacturer" className="input" /></L>
          <L label="Modell"><input name="model" className="input" /></L>
          <label className="flex items-center gap-2 text-sm sm:col-span-3"><input type="checkbox" name="customerVisible" className="size-4 accent-amber-500" />Kunde sieht diesen Artikel (Vorschlag für Anlagen)</label>
          <div><SaveButton label="Anlegen" /></div>
        </form>
      </Card>
    </Page>
  );
}
