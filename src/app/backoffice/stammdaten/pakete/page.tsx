import { prisma } from "@/lib/db";
import { deletePackage, savePackage } from "../../actions";
import { Card, Check, DeleteButton, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pakete" };

type Cat = { id: string; name: string; addons: { id: string; name: string }[] };

function AddonPicker({ categories, selected, name = "addonIds", title, accent = "accent-amber-500" }: { categories: Cat[]; selected: Set<string>; name?: string; title: string; accent?: string }) {
  return (
    <div className="space-y-2 sm:col-span-4">
      <span className="block text-xs text-neutral-400">{title}</span>
      {categories.map((c) => (
        <div key={c.id}>
          <div className="mb-1 text-xs font-semibold text-neutral-500">{c.name}</div>
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {c.addons.map((a) => (
              <label key={a.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={name} value={a.id} defaultChecked={selected.has(a.id)} className={`size-4 ${accent}`} />
                {a.name}
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type Rig = { id: string; name: string };
function Fields({ p, rigs }: { rigs: Rig[]; p?: { name: string; description: string; priceCategory: string; maxPerspectives: number | null; maxSpeakers: number | null; sortOrder: number; price: number | null; rigId: string | null } }) {
  return (
    <>
      <L label="Name"><input name="name" defaultValue={p?.name} className="input" required /></L>
      <L label="Preiskategorie"><input name="priceCategory" defaultValue={p?.priceCategory ?? "€"} className="input" placeholder="€, €€, €€€ oder „ab 2.000 €“" /></L>
      <L label="Max. Perspektiven"><input name="maxPerspectives" type="number" defaultValue={p?.maxPerspectives ?? ""} className="input" placeholder="unbegrenzt" /></L>
      <L label="Max. Sprecher"><input name="maxSpeakers" type="number" defaultValue={p?.maxSpeakers ?? ""} className="input" placeholder="unbegrenzt" /></L>
      <L label="Beschreibung" className="sm:col-span-3"><input name="description" defaultValue={p?.description} className="input" /></L>
      <L label="Reihenfolge (klein → groß)"><input name="sortOrder" type="number" defaultValue={p?.sortOrder ?? 0} className="input" /></L>
      <L label="Interner Preis pro Tag (€, für Angebote)"><input name="price" type="number" step="0.01" defaultValue={p?.price ?? ""} className="input" /></L>
      <L label="Anlage (Technik aus dem Inventar)" className="sm:col-span-2">
        <select name="rigId" defaultValue={p?.rigId ?? ""} className="input">
          <option value="">– keine –</option>
          {rigs.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
      </L>
    </>
  );
}

export default async function PaketePage() {
  const [packages, categories, rigs] = await Promise.all([
    prisma.package.findMany({ orderBy: { sortOrder: "asc" }, include: { includedAddons: true, excludedAddons: true } }),
    prisma.addonCategory.findMany({ orderBy: { sortOrder: "asc" }, include: { addons: { where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } } } }),
    prisma.rig.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { id: true, name: true } }),
  ]);
  return (
    <Page title="Pakete" intro="Grundpakete aus Schritt 1. Empfohlen wird das erste Paket (nach Reihenfolge), das die gewünschten Perspektiven und Sprecher abdeckt. Leeres Feld = unbegrenzt.">
      {packages.map((p) => (
        <Card key={p.id} muted={!p.active}>
          <form action={savePackage} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="id" value={p.id} />
            <Fields p={p} rigs={rigs} />
            <AddonPicker categories={categories} selected={new Set(p.includedAddons.map((i) => i.addonId))} title="Im Paket enthalten (wird in der Buchung als „im Paket enthalten“ markiert)" />
            <AddonPicker categories={categories} selected={new Set(p.excludedAddons.map((i) => i.addonId))} name="excludedIds" accent="accent-red-500" title="Funktioniert NICHT mit diesem Paket (in der Buchung ausgegraut)" />
            <div className="flex items-center gap-4 sm:col-span-4">
              <Check name="active" label="aktiv" defaultChecked={p.active} />
              <SaveButton />
            </div>
          </form>
          <div className="mt-2 flex justify-end"><DeleteButton action={deletePackage} id={p.id} /></div>
        </Card>
      ))}
      <Card>
        <NewTitle>Neues Paket</NewTitle>
        <form action={savePackage} className="grid gap-3 sm:grid-cols-4">
          <Fields rigs={rigs} />
          <AddonPicker categories={categories} selected={new Set()} title="Im Paket enthalten (wird in der Buchung als „im Paket enthalten“ markiert)" />
          <AddonPicker categories={categories} selected={new Set()} name="excludedIds" accent="accent-red-500" title="Funktioniert NICHT mit diesem Paket (in der Buchung ausgegraut)" />
          <div className="sm:col-span-4"><SaveButton label="Hinzufügen" /></div>
        </form>
      </Card>
    </Page>
  );
}
