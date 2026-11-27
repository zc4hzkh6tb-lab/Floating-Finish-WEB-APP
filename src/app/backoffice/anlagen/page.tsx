import Link from "next/link";
import { prisma } from "@/lib/db";
import { saveRig } from "../lager-actions";
import { Card, L, NewTitle, Page, SaveButton } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Anlagen" };

export default async function AnlagenPage() {
  const [rigs, addons] = await Promise.all([
    prisma.rig.findMany({ orderBy: { sortOrder: "asc" }, include: { items: true, packages: true } }),
    prisma.addon.findMany({ where: { active: true }, orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }], include: { category: true, articles: true } }),
  ]);
  return (
    <Page title="Anlagen" intro="Eine Anlage ist eine feste Zusammenstellung aus dem Inventar. Pakete nutzen eine Anlage. Je Bestandteil entscheidest du, ob der Kunde ihn sieht. Kabel und Adapter bleiben intern, Hauptgeräte zeigst du an.">
      <div className="grid gap-3 sm:grid-cols-2">
        {rigs.map((r) => (
          <Link key={r.id} href={`/backoffice/anlagen/${r.id}`} className={`rounded-xl border border-neutral-700 p-4 hover:border-amber-500 ${r.active ? "" : "opacity-50"}`}>
            <div className="font-semibold">{r.name}</div>
            <div className="mt-1 text-sm text-neutral-400">{r.items.length} Positionen · {r.items.filter((i) => i.customerVisible).length} für Kunden sichtbar</div>
            <div className="mt-1 text-xs text-neutral-500">Pakete: {r.packages.map((p) => p.name).join(", ") || "–"}</div>
          </Link>
        ))}
      </div>
      <Card>
        <NewTitle>Neue Anlage</NewTitle>
        <form action={saveRig} className="flex flex-wrap items-end gap-3">
          <L label="Name" className="min-w-64 flex-1"><input name="name" className="input" required /></L>
          <SaveButton label="Anlegen" />
        </form>
      </Card>
      <h2 className="pt-6 text-lg font-semibold">Material je Add-on</h2>
      <p className="text-sm text-neutral-400">Was zusätzlich mitkommt, wenn ein Add-on gebucht ist. Daraus entsteht die Materialliste eines Jobs.</p>
      <div className="grid gap-2 sm:grid-cols-3">
        {addons.map((a) => (
          <Link key={a.id} href={`/backoffice/anlagen/addon/${a.id}`} className="rounded-lg border border-neutral-800 px-3 py-2 text-sm hover:border-amber-500">
            {a.name}
            <div className="text-xs text-neutral-500">{a.category.name} · {a.articles.length} Artikel</div>
          </Link>
        ))}
      </div>
    </Page>
  );
}
