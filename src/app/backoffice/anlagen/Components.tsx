import { deleteComponent, saveComponent } from "../lager-actions";
import { Card, NewTitle, SaveButton } from "../ui";

type Item = { id: string; quantity: number; customerVisible: boolean; note?: string | null; article: { id: string; name: string; kind: string; category: { name: string } | null } };
type Art = { id: string; name: string; category: { name: string } | null };

/** Bestandteile einer Anlage oder eines Add-ons mit Sichtbarkeit für den Kunden. */
export function Components({ owner, ownerId, items, articles }: { owner: "rig" | "addon"; ownerId: string; items: Item[]; articles: Art[] }) {
  const hidden = (
    <>
      <input type="hidden" name="owner" value={owner} />
      <input type="hidden" name="ownerId" value={ownerId} />
    </>
  );
  const visible = items.filter((i) => i.customerVisible);
  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs text-neutral-400">
            <tr><th className="p-2">Artikel</th><th className="p-2">Menge</th>{owner === "rig" && <th className="p-2">Notiz</th>}<th className="p-2">Kunde sieht</th><th className="p-2" /></tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id} className="border-t border-neutral-800">
                <td className="p-2">{i.article.name}<div className="text-xs text-neutral-500">{i.article.category?.name}</div></td>
                <td className="p-2" colSpan={owner === "rig" ? 3 : 2}>
                  <form action={saveComponent} className="flex flex-wrap items-center gap-2">
                    {hidden}
                    <input type="hidden" name="id" value={i.id} />
                    <input name="quantity" type="number" min={1} defaultValue={i.quantity} className="input !w-20" />
                    {owner === "rig" && <input name="note" defaultValue={i.note ?? ""} placeholder="Notiz" className="input !w-48" />}
                    <label className="flex items-center gap-1.5"><input type="checkbox" name="customerVisible" defaultChecked={i.customerVisible} className="size-4 accent-amber-500" />sichtbar</label>
                    <button className="btn-ghost !px-3 !py-1">Speichern</button>
                  </form>
                </td>
                <td className="p-2 text-right">
                  <form action={deleteComponent}>{hidden}<input type="hidden" name="id" value={i.id} /><button className="text-red-400">entfernen</button></form>
                </td>
              </tr>
            ))}
            {items.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-neutral-500">Noch keine Bestandteile.</td></tr>}
          </tbody>
        </table>
      </div>
      <Card>
        <NewTitle>Artikel aus dem Inventar hinzufügen</NewTitle>
        <form action={saveComponent} className="flex flex-wrap items-end gap-3">
          {hidden}
          <select name="articleId" className="input !w-auto min-w-64 flex-1" required>
            <option value="">Artikel wählen …</option>
            {articles.map((a) => <option key={a.id} value={a.id}>{a.category ? `${a.category.name}: ` : ""}{a.name}</option>)}
          </select>
          <input name="quantity" type="number" min={1} defaultValue={1} className="input !w-20" />
          <SaveButton label="Hinzufügen" />
        </form>
        <p className="mt-2 text-xs text-neutral-500">Sichtbarkeit wird vom Artikel übernommen und lässt sich danach je Position ändern.</p>
      </Card>
      <div className="rounded-xl border border-sky-800 bg-sky-950/30 p-4 text-sm">
        <div className="mb-1 font-semibold text-sky-300">So sieht es der Kunde</div>
        {visible.length ? <ul className="list-disc pl-5">{visible.map((i) => <li key={i.id}>{i.quantity > 1 ? `${i.quantity} × ` : ""}{i.article.name}</li>)}</ul> : <p className="text-neutral-400">Keine sichtbaren Bestandteile.</p>}
      </div>
    </div>
  );
}
