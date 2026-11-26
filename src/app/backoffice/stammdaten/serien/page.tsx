import { prisma } from "@/lib/db";
import { deleteSeries, saveSeries } from "../../actions";
import { Card, Check, DeleteButton, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Serien" };

export default async function SerienPage() {
  const items = await prisma.series.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  return (
    <Page title="Serien" intro="Wettkampfserien in der Buchung. Die Farbe leuchtet auf, wenn der Kunde die Serie wählt. In Anfragen genutzte Serien werden beim Löschen nur deaktiviert.">
      {items.map((s) => (
        <Card key={s.id} muted={!s.active}>
          <div className="flex flex-wrap items-end gap-3">
            <form action={saveSeries} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={s.id} />
              <L label={`Name (${s.code})`} className="min-w-48 flex-1"><input name="name" defaultValue={s.name} className="input" /></L>
              <L label="Farbe"><input type="color" name="color" defaultValue={s.color} className="h-10 w-16 cursor-pointer rounded border border-neutral-700 bg-neutral-900" /></L>
              <L label="Hinweis" className="min-w-48 flex-1"><input name="note" defaultValue={s.note ?? ""} className="input" /></L>
              <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={s.sortOrder} className="input w-24" /></L>
              <div className="pb-2"><Check name="active" label="aktiv" defaultChecked={s.active} /></div>
              <SaveButton />
            </form>
            <DeleteButton action={deleteSeries} id={s.id} />
          </div>
        </Card>
      ))}
      <Card>
        <NewTitle>Neue Serie</NewTitle>
        <form action={saveSeries} className="flex flex-wrap items-end gap-3">
          <L label="Name" className="min-w-48 flex-1"><input name="name" className="input" required /></L>
          <L label="Kürzel (optional)"><input name="code" className="input w-32" /></L>
          <L label="Farbe"><input type="color" name="color" defaultValue="#f59e0b" className="h-10 w-16 cursor-pointer rounded border border-neutral-700 bg-neutral-900" /></L>
          <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={items.length} className="input w-24" /></L>
          <SaveButton label="Hinzufügen" />
        </form>
      </Card>
    </Page>
  );
}
