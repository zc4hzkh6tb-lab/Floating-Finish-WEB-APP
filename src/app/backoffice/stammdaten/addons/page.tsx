import { prisma } from "@/lib/db";
import { deleteAddon, deleteCategory, saveAddon, saveCategory } from "../../actions";
import { Card, Check, DeleteButton, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add-ons" };

export default async function AddonsPage() {
  const categories = await prisma.addonCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { addons: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { inPackages: { include: { package: true } } } } },
  });
  const catSelect = (selected?: string) => (
    <select name="categoryId" defaultValue={selected} className="input">
      {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
    </select>
  );
  return (
    <Page title="Add-ons" intro="Zusatzleistungen, die der Kunde pro VA-Tag dazubuchen kann. Der Richtpreis wird in der Buchung angezeigt. „Löst LED-Seite aus“ blendet die Extra-Seite zur LED-Wand ein.">
      <Card>
        <NewTitle>Neues Add-on</NewTitle>
        <form action={saveAddon} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <L label="Name"><input name="name" className="input" required /></L>
          <L label="Kategorie">{catSelect()}</L>
          <L label="Richtpreis"><input name="priceHint" className="input" placeholder="z. B. ab 300 € / Tag" /></L>
          <div className="flex items-end"><SaveButton label="Hinzufügen" /></div>
        </form>
      </Card>

      {categories.map((cat) => (
        <section key={cat.id} className="space-y-3 pt-4">
          <div className="flex flex-wrap items-end gap-3">
            <form action={saveCategory} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={cat.id} />
              <L label="Kategorie" className="min-w-48 flex-1"><input name="name" defaultValue={cat.name} className="input font-semibold" /></L>
              <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={cat.sortOrder} className="input w-24" /></L>
              <SaveButton />
            </form>
            {cat.addons.length === 0 && <DeleteButton action={deleteCategory} id={cat.id} />}
          </div>
          {cat.addons.map((a) => (
            <Card key={a.id} muted={!a.active}>
              <form action={saveAddon} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_90px]">
                <input type="hidden" name="id" value={a.id} />
                <L label="Name"><input name="name" defaultValue={a.name} className="input" /></L>
                <L label="Kategorie">{catSelect(a.categoryId)}</L>
                <L label="Richtpreis"><input name="priceHint" defaultValue={a.priceHint ?? ""} className="input" placeholder="Preis folgt" /></L>
                <L label="Reihenf."><input name="sortOrder" type="number" defaultValue={a.sortOrder} className="input" /></L>
                <L label="Beschreibung (optional)" className="sm:col-span-2"><input name="description" defaultValue={a.description ?? ""} className="input" /></L>
                <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
                  <Check name="active" label="aktiv" defaultChecked={a.active} />
                  <Check name="isLedWall" label="Löst LED-Seite aus" defaultChecked={a.isLedWall} />
                  <SaveButton />
                </div>
                {a.inPackages.length > 0 && <p className="text-xs text-emerald-400 sm:col-span-4">Enthalten in: {a.inPackages.map((p) => p.package.name).join(", ")}</p>}
              </form>
              <div className="mt-2 flex justify-end"><DeleteButton action={deleteAddon} id={a.id} /></div>
            </Card>
          ))}
        </section>
      ))}

      <Card>
        <NewTitle>Neue Kategorie</NewTitle>
        <form action={saveCategory} className="flex flex-wrap items-end gap-3">
          <L label="Name" className="min-w-48 flex-1"><input name="name" className="input" required /></L>
          <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={categories.length} className="input w-24" /></L>
          <SaveButton label="Hinzufügen" />
        </form>
      </Card>
    </Page>
  );
}
