import { prisma } from "@/lib/db";
import { deleteLedSize, saveLedSize } from "../../actions";
import { Card, Check, DeleteButton, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "LED-Größen" };

export default async function LedPage() {
  const items = await prisma.ledSize.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] });
  return (
    <Page title="LED-Größen" intro="Größen, die der Kunde auf der LED-Wand-Seite auswählen kann.">
      <Card>
        <NewTitle>Neue Größe</NewTitle>
        <form action={saveLedSize} className="flex flex-wrap items-end gap-3">
          <L label="Größe" className="min-w-64 flex-1"><input name="label" className="input" placeholder="z. B. 4 × 2,5 m" required /></L>
          <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={items.length} className="input w-24" /></L>
          <SaveButton label="Hinzufügen" />
        </form>
      </Card>
      {items.map((c) => (
        <Card key={c.id} muted={!c.active}>
          <div className="flex flex-wrap items-end gap-3">
            <form action={saveLedSize} className="flex flex-1 flex-wrap items-end gap-3">
              <input type="hidden" name="id" value={c.id} />
              <L label="Größe" className="min-w-64 flex-1"><input name="label" defaultValue={c.label} className="input" /></L>
              <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={c.sortOrder} className="input w-24" /></L>
              <div className="pb-2"><Check name="active" label="aktiv" defaultChecked={c.active} /></div>
              <SaveButton />
            </form>
            <DeleteButton action={deleteLedSize} id={c.id} />
          </div>
        </Card>
      ))}
    </Page>
  );
}
