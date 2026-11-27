import Link from "next/link";
import { prisma } from "@/lib/db";
import { OFFER_STATUS, eur } from "@/lib/labels";
import { Page } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Angebote" };

const STYLE = { ENTWURF: "bg-neutral-700 text-neutral-200", VERSENDET: "bg-sky-800 text-sky-100", ANGENOMMEN: "bg-emerald-700 text-emerald-50", ABGELEHNT: "bg-red-800 text-red-100" } as const;

export default async function AngebotePage() {
  const offers = await prisma.offer.findMany({ orderBy: { createdAt: "desc" }, include: { items: true, booking: true } });
  return (
    <Page title="Angebote" intro="Angebote entstehen aus einer Anfrage (Button „Angebot aus Anfrage erstellen“) und lassen sich frei bearbeiten.">
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs text-neutral-400"><tr><th className="p-2">Nr.</th><th className="p-2">Anfrage</th><th className="p-2">Erstellt</th><th className="p-2 text-right">Netto</th><th className="p-2">Status</th></tr></thead>
          <tbody>
            {offers.map((o) => (
              <tr key={o.id} className="border-t border-neutral-800">
                <td className="p-2"><Link href={`/backoffice/angebote/${o.id}`} className="text-amber-400">A-{o.number}</Link></td>
                <td className="p-2"><Link href={`/backoffice/anfragen/${o.bookingId}`} className="hover:underline">#{o.booking.number} {o.booking.eventName}</Link><div className="text-xs text-neutral-500">{o.booking.organizer}</div></td>
                <td className="p-2">{o.createdAt.toLocaleDateString("de-DE")}</td>
                <td className="p-2 text-right">{eur(o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0))}</td>
                <td className="p-2"><span className={`rounded px-2 py-0.5 text-xs ${STYLE[o.status]}`}>{OFFER_STATUS[o.status]}</span></td>
              </tr>
            ))}
            {offers.length === 0 && <tr><td colSpan={5} className="p-4 text-center text-neutral-500">Noch keine Angebote.</td></tr>}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
