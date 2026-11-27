import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { OFFER_STATUS, eur } from "@/lib/labels";
import { deleteOffer, deleteOfferItem, saveOffer, saveOfferItem, setOfferStatus } from "../../job-actions";
import { Back, Card, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";

export default async function OfferPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const o = await prisma.offer.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } }, booking: true } });
  if (!o) notFound();
  const net = o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
  const vat = (net * o.vatRate) / 100;
  const hid = <input type="hidden" name="offerId" value={o.id} />;
  return (
    <Page
      title={`Angebot A-${o.number}`}
      intro={<Back href={`/backoffice/anfragen/${o.bookingId}`} label={`Anfrage #${o.booking.number} ${o.booking.eventName}`} />}
      actions={<Link href={`/backoffice/angebote/${o.id}/druck`} className="btn-ghost">Druckansicht / PDF</Link>}
    >
      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-neutral-400">Status:</span>
          {Object.entries(OFFER_STATUS).map(([k, l]) => (
            <form key={k} action={setOfferStatus}>
              {hid}
              <input type="hidden" name="status" value={k} />
              <button className={`rounded-full border px-3 py-1 text-sm ${o.status === k ? "border-amber-500 bg-amber-500 font-semibold text-black" : "border-neutral-600"}`}>{l}</button>
            </form>
          ))}
          <span className="text-xs text-neutral-500">„angenommen“ setzt die Anfrage auf „bestätigt“.</span>
        </div>
      </Card>
      <Card>
        <form action={saveOffer} className="grid gap-3 sm:grid-cols-4">
          {hid}
          <L label="Titel" className="sm:col-span-2"><input name="title" defaultValue={o.title} className="input" /></L>
          <L label="Gültig bis"><input name="validUntil" type="date" defaultValue={o.validUntil?.toISOString().slice(0, 10) ?? ""} className="input" /></L>
          <L label="MwSt. %"><input name="vatRate" type="number" step="0.1" defaultValue={o.vatRate} className="input" /></L>
          <L label="Einleitung" className="sm:col-span-4"><textarea name="intro" rows={2} defaultValue={o.intro ?? ""} className="input" /></L>
          <L label="Schlusstext" className="sm:col-span-4"><textarea name="outro" rows={2} defaultValue={o.outro ?? ""} className="input" /></L>
          <div><SaveButton /></div>
        </form>
      </Card>
      <h2 className="pt-2 text-lg font-semibold">Positionen</h2>
      {o.items.map((i) => (
        <Card key={i.id}>
          <div className="flex flex-wrap items-end gap-2">
            <form action={saveOfferItem} className="grid flex-1 gap-2 sm:grid-cols-[50px_2fr_70px_70px_100px_100px_auto]">
              {hid}
              <input type="hidden" name="itemId" value={i.id} />
              <L label="Pos."><input name="position" type="number" defaultValue={i.position} className="input" /></L>
              <L label="Bezeichnung"><input name="name" defaultValue={i.name} className="input" /></L>
              <L label="Menge"><input name="quantity" type="number" step="0.5" defaultValue={i.quantity} className="input" /></L>
              <L label="Einheit"><input name="unit" defaultValue={i.unit} className="input" /></L>
              <L label="Einzelpreis"><input name="unitPrice" type="number" step="0.01" defaultValue={i.unitPrice} className="input" /></L>
              <div className="pb-2 text-right text-sm"><div className="text-xs text-neutral-500">Gesamt</div>{eur(i.quantity * i.unitPrice)}</div>
              <div className="flex items-end"><SaveButton label="✓" /></div>
              <L label="Beschreibung" className="sm:col-span-7"><input name="description" defaultValue={i.description ?? ""} className="input" /></L>
            </form>
            <form action={deleteOfferItem}>{hid}<input type="hidden" name="itemId" value={i.id} /><button className="btn-ghost text-red-400">×</button></form>
          </div>
        </Card>
      ))}
      <Card>
        <NewTitle>Position hinzufügen</NewTitle>
        <form action={saveOfferItem} className="grid gap-2 sm:grid-cols-[2fr_70px_70px_100px_auto]">
          {hid}
          <input type="hidden" name="position" value={o.items.length + 1} />
          <L label="Bezeichnung"><input name="name" className="input" required /></L>
          <L label="Menge"><input name="quantity" type="number" step="0.5" defaultValue={1} className="input" /></L>
          <L label="Einheit"><input name="unit" defaultValue="Stk" className="input" /></L>
          <L label="Einzelpreis"><input name="unitPrice" type="number" step="0.01" defaultValue={0} className="input" /></L>
          <div className="flex items-end"><SaveButton label="Hinzufügen" /></div>
        </form>
      </Card>
      <Card>
        <div className="ml-auto max-w-xs space-y-1 text-sm">
          <div className="flex justify-between"><span>Netto</span><span>{eur(net)}</span></div>
          <div className="flex justify-between text-neutral-400"><span>MwSt. {o.vatRate} %</span><span>{eur(vat)}</span></div>
          <div className="flex justify-between border-t border-neutral-700 pt-1 font-semibold"><span>Gesamt</span><span>{eur(net + vat)}</span></div>
        </div>
      </Card>
      <form action={deleteOffer}>{hid}<button className="btn-ghost !border-red-900 text-red-400">Angebot löschen</button></form>
    </Page>
  );
}
