import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { deleteRig, saveRig } from "../../lager-actions";
import { Back, Card, L, Page, SaveButton } from "../../ui";
import { Components } from "../Components";

export const dynamic = "force-dynamic";

export default async function RigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [rig, articles] = await Promise.all([
    prisma.rig.findUnique({ where: { id }, include: { packages: true, items: { include: { article: { include: { category: true } } }, orderBy: { article: { name: "asc" } } } } }),
    prisma.article.findMany({ where: { active: true }, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }], include: { category: true } }),
  ]);
  if (!rig) notFound();
  return (
    <Page title={rig.name} intro={<Back href="/backoffice/anlagen" label="Anlagen" />}>
      <Card>
        <form action={saveRig} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" value={rig.id} />
          <L label="Name" className="sm:col-span-3"><input name="name" defaultValue={rig.name} className="input" /></L>
          <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={rig.sortOrder} className="input" /></L>
          <L label="Beschreibung für den Kunden" className="sm:col-span-2"><textarea name="customerDescription" rows={3} defaultValue={rig.customerDescription ?? ""} className="input" /></L>
          <L label="Interne Beschreibung" className="sm:col-span-2"><textarea name="description" rows={3} defaultValue={rig.description ?? ""} className="input" /></L>
          <div className="flex items-center gap-4 sm:col-span-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={rig.active} className="size-4 accent-amber-500" />aktiv</label>
            <SaveButton />
            <span className="text-xs text-neutral-500">Genutzt von: {rig.packages.map((p) => p.name).join(", ") || "keinem Paket (unter Pakete zuordnen)"}</span>
          </div>
        </form>
      </Card>
      <h2 className="pt-4 text-lg font-semibold">Bestandteile</h2>
      <Components owner="rig" ownerId={rig.id} items={rig.items} articles={articles} />
      <form action={deleteRig} className="pt-4"><input type="hidden" name="id" value={rig.id} /><button className="btn-ghost !border-red-900 text-red-400">Anlage löschen</button></form>
    </Page>
  );
}
