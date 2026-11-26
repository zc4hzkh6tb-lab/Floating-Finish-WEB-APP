import { prisma } from "@/lib/db";
import { deleteClass, saveClass } from "../../actions";
import { Card, Check, DeleteButton, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Klassen" };

export default async function KlassenPage() {
  const items = await prisma.vehicleClass.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <Page title="Klassen" intro="Diese Klassen erscheinen als Suchvorschläge in der Buchung, z. B. „3,5“ zeigt alle 3,5-t-Klassen.">
      <Card>
        <NewTitle>Neue Klasse</NewTitle>
        <form action={saveClass} className="flex flex-wrap items-end gap-3">
          <L label="Name" className="min-w-64 flex-1"><input name="name" className="input" placeholder="z. B. 3,5 t Sport" required /></L>
          <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={items.length} className="input w-24" /></L>
          <SaveButton label="Hinzufügen" />
        </form>
      </Card>
      {items.map((c) => (
        <Card key={c.id} muted={!c.active}>
          <div className="flex flex-wrap items-end gap-3">
            <form action={saveClass} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <L label="Name" className="min-w-64 flex-1"><input name="name" defaultValue={c.name} className="input" /></L>
              <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={c.sortOrder} className="input w-24" /></L>
              <div className="pb-2"><Check name="active" label="aktiv" defaultChecked={c.active} /></div>
              <SaveButton />
            </form>
            <DeleteButton action={deleteClass} id={c.id} />
          </div>
        </Card>
      ))}
    </Page>
  );
}
