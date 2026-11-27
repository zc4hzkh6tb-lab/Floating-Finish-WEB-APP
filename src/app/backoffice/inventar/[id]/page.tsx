import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { ARTICLE_KIND, UNIT_STATUS } from "@/lib/labels";
import { deleteArticle, deleteUnit, saveArticle, saveUnit } from "../../lager-actions";
import { Back, Card, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [a, categories] = await Promise.all([
    prisma.article.findUnique({
      where: { id },
      include: { units: { orderBy: { inventoryNo: "asc" } }, rigItems: { include: { rig: true } }, addonItems: { include: { addon: true } }, materialItems: { include: { booking: true }, orderBy: { booking: { createdAt: "desc" } }, take: 20 } },
    }),
    prisma.articleCategory.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  if (!a) notFound();
  const unitFields = (u?: (typeof a.units)[number]) => (
    <>
      <input type="hidden" name="articleId" value={a.id} />
      <L label="Inventar-Nr."><input name="inventoryNo" defaultValue={u?.inventoryNo ?? ""} className="input" /></L>
      <L label="Seriennummer"><input name="serial" defaultValue={u?.serial ?? ""} className="input" /></L>
      <L label="Status"><select name="status" defaultValue={u?.status ?? "OK"} className="input">{Object.entries(UNIT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></L>
      <L label="Kaufdatum"><input name="purchaseDate" type="date" defaultValue={u?.purchaseDate?.toISOString().slice(0, 10) ?? ""} className="input" /></L>
      <L label="Notiz"><input name="note" defaultValue={u?.note ?? ""} className="input" /></L>
    </>
  );
  return (
    <Page title={a.name} intro={<Back href="/backoffice/inventar" label="Inventar" />}>
      <Card>
        <form action={saveArticle} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" value={a.id} />
          <L label="Name" className="sm:col-span-2"><input name="name" defaultValue={a.name} className="input" required /></L>
          <L label="Artikelnummer"><input name="number" defaultValue={a.number ?? ""} className="input" /></L>
          <L label="Kategorie"><select name="categoryId" defaultValue={a.categoryId ?? ""} className="input"><option value="">–</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></L>
          <L label="Art"><select name="kind" defaultValue={a.kind} className="input">{Object.entries(ARTICLE_KIND).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></L>
          <L label="Hersteller"><input name="manufacturer" defaultValue={a.manufacturer ?? ""} className="input" /></L>
          <L label="Modell"><input name="model" defaultValue={a.model ?? ""} className="input" /></L>
          <L label="Lagerort"><input name="storage" defaultValue={a.storage ?? ""} className="input" /></L>
          <L label="Bestand"><input name="quantity" type="number" defaultValue={a.quantity} className="input" /></L>
          <L label="Einheit"><input name="unit" defaultValue={a.unit} className="input" /></L>
          <L label="Gewicht (kg)"><input name="weightKg" type="number" step="0.01" defaultValue={a.weightKg ?? ""} className="input" /></L>
          <L label="Einkaufspreis (€)"><input name="purchasePrice" type="number" step="0.01" defaultValue={a.purchasePrice ?? ""} className="input" /></L>
          <L label="Interner Tagessatz (€)"><input name="rentalPrice" type="number" step="0.01" defaultValue={a.rentalPrice ?? ""} className="input" /></L>
          <L label="Notizen" className="sm:col-span-3"><input name="notes" defaultValue={a.notes ?? ""} className="input" /></L>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-4">
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="customerVisible" defaultChecked={a.customerVisible} className="size-4 accent-amber-500" />Kunde sieht diesen Artikel</label>
            <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={a.active} className="size-4 accent-amber-500" />aktiv</label>
            <SaveButton />
          </div>
        </form>
      </Card>

      <h2 className="pt-4 text-lg font-semibold">Einzelgeräte ({a.units.length})</h2>
      <p className="text-sm text-neutral-400">Für Geräte, die einzeln mit Inventar- oder Seriennummer geführt werden.</p>
      {a.units.map((u) => (
        <Card key={u.id}>
          <div className="flex flex-wrap items-end gap-3">
            <form action={saveUnit} className="grid flex-1 gap-3 sm:grid-cols-6">
              <input type="hidden" name="id" value={u.id} />
              {unitFields(u)}
              <div className="flex items-end"><SaveButton /></div>
            </form>
            <form action={deleteUnit}><input type="hidden" name="id" value={u.id} /><input type="hidden" name="articleId" value={a.id} /><button className="btn-ghost text-red-400">×</button></form>
          </div>
        </Card>
      ))}
      <Card>
        <NewTitle>Gerät erfassen</NewTitle>
        <form action={saveUnit} className="grid gap-3 sm:grid-cols-6">{unitFields()}<div className="flex items-end"><SaveButton label="Hinzufügen" /></div></form>
      </Card>

      <h2 className="pt-4 text-lg font-semibold">Verwendung</h2>
      <Card>
        <div className="space-y-1 text-sm">
          <div><span className="text-neutral-500">Anlagen:</span> {a.rigItems.map((r) => <Link key={r.id} href={`/backoffice/anlagen/${r.rigId}`} className="mr-2 text-amber-400">{r.rig.name} ({r.quantity}×)</Link>)}{a.rigItems.length === 0 && "–"}</div>
          <div><span className="text-neutral-500">Add-ons:</span> {a.addonItems.map((r) => `${r.addon.name} (${r.quantity}×)`).join(", ") || "–"}</div>
          <div><span className="text-neutral-500">Letzte Jobs:</span> {a.materialItems.map((m) => <Link key={m.id} href={`/backoffice/anfragen/${m.bookingId}`} className="mr-2 text-amber-400">#{m.booking.number} {m.booking.eventName}</Link>)}{a.materialItems.length === 0 && "–"}</div>
        </div>
      </Card>
      <form action={deleteArticle} className="pt-4"><input type="hidden" name="id" value={a.id} /><button className="btn-ghost !border-red-900 text-red-400">Artikel löschen (wird bei Verwendung nur deaktiviert)</button></form>
    </Page>
  );
}
