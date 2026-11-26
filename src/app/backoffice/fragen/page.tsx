import { prisma } from "@/lib/db";
import { deleteQuestion, saveQuestion } from "../actions";
import { Card, Check, DeleteButton, L, NewTitle, Page, SaveButton } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Eigene Fragen" };

const TYPES = { TEXT: "Text", NUMBER: "Zahl", YESNO: "Ja / Nein", SELECT: "Auswahl" } as const;

function Fields({ q }: { q?: { label: string; help: string | null; type: keyof typeof TYPES; options: string[]; required: boolean; sortOrder: number } }) {
  return (
    <>
      <L label="Frage" className="sm:col-span-2"><input name="label" defaultValue={q?.label} className="input" required /></L>
      <L label="Art">
        <select name="type" defaultValue={q?.type ?? "TEXT"} className="input">
          {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </L>
      <L label="Reihenfolge"><input name="sortOrder" type="number" defaultValue={q?.sortOrder ?? 0} className="input" /></L>
      <L label="Hilfetext (optional)" className="sm:col-span-2"><input name="help" defaultValue={q?.help ?? ""} className="input" /></L>
      <L label="Auswahlmöglichkeiten (nur bei „Auswahl“, eine pro Zeile)" className="sm:col-span-2">
        <textarea name="options" rows={3} defaultValue={q?.options.join("\n")} className="input" />
      </L>
    </>
  );
}

export default async function FragenPage() {
  const items = await prisma.customQuestion.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] });
  return (
    <Page title="Eigene Fragen" intro="Fragen, die zusätzlich auf der ersten Seite der Buchung (Veranstaltung) erscheinen. Die Antworten stehen in der Anfrage.">
      <Card>
        <NewTitle>Neue Frage</NewTitle>
        <form action={saveQuestion} className="grid gap-3 sm:grid-cols-4">
          <Fields />
          <div className="flex items-center gap-4 sm:col-span-4">
            <Check name="required" label="Pflichtfrage" />
            <SaveButton label="Hinzufügen" />
          </div>
        </form>
      </Card>
      {items.length === 0 && <p className="text-sm text-neutral-500">Noch keine eigenen Fragen.</p>}
      {items.map((q) => (
        <Card key={q.id} muted={!q.active}>
          <form action={saveQuestion} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="id" value={q.id} />
            <Fields q={q} />
            <div className="flex items-center gap-4 sm:col-span-4">
              <Check name="required" label="Pflichtfrage" defaultChecked={q.required} />
              <Check name="active" label="aktiv" defaultChecked={q.active} />
              <SaveButton />
            </div>
          </form>
          <div className="mt-2 flex justify-end"><DeleteButton action={deleteQuestion} id={q.id} /></div>
        </Card>
      ))}
    </Page>
  );
}
