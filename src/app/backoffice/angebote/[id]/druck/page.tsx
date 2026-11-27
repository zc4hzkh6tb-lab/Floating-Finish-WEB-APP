import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { eur, fmtDay } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { PrintButton } from "../../../PrintButton";

export const dynamic = "force-dynamic";

export default async function OfferPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [o, s] = await Promise.all([
    prisma.offer.findUnique({ where: { id }, include: { items: { orderBy: { position: "asc" } }, booking: { include: { days: { orderBy: { date: "asc" } }, organizerRef: true } } } }),
    getSettings(),
  ]);
  if (!o) notFound();
  const b = o.booking;
  const org = b.organizerRef;
  const net = o.items.reduce((n, i) => n + i.quantity * i.unitPrice, 0);
  const vat = (net * o.vatRate) / 100;
  return (
    <div className="mx-auto min-h-screen max-w-3xl bg-white px-10 py-10 text-[13px] text-black print:p-0">
      <div className="flex justify-between">
        <div className="text-xs text-neutral-600">{s.firma_name} · {s.firma_adresse.replace(/\n/g, " · ")}</div>
        <PrintButton />
      </div>
      <div className="mt-8 flex justify-between">
        <div className="whitespace-pre-line">
          {org ? [org.name, org.contactName, org.street, [org.zip, org.city].filter(Boolean).join(" "), org.country].filter(Boolean).join("\n") : `${b.organizer}\n${b.contactName}`}
        </div>
        <div className="text-right">
          <div className="text-xl font-bold">{s.firma_name}</div>
          <div className="whitespace-pre-line text-xs">{s.firma_adresse}</div>
          <div className="text-xs">{s.firma_kontakt}</div>
        </div>
      </div>
      <div className="mt-10 flex items-end justify-between">
        <h1 className="text-xl font-bold">{o.title}</h1>
        <div className="text-right text-xs">Angebot A-{o.number}<br />Datum {o.createdAt.toLocaleDateString("de-DE")}{o.validUntil && <><br />gültig bis {fmtDay(o.validUntil)}</>}</div>
      </div>
      <p className="mt-1 text-xs text-neutral-600">{b.eventName} · {b.eventLocation} · {b.days.map((d) => fmtDay(d.date)).join(", ")}</p>
      <p className="mt-6">Sehr geehrte Damen und Herren,</p>
      <p className="mt-2 whitespace-pre-line">{o.intro}</p>
      <table className="mt-6 w-full">
        <thead><tr className="border-b-2 border-black text-left"><th className="py-1">Pos.</th><th>Leistung</th><th className="text-right">Menge</th><th className="text-right">Einzelpreis</th><th className="text-right">Gesamt</th></tr></thead>
        <tbody>
          {o.items.map((i) => (
            <tr key={i.id} className="border-b border-neutral-300 align-top">
              <td className="py-1.5">{i.position}</td>
              <td className="py-1.5">{i.name}{i.description && <div className="text-xs text-neutral-600">{i.description}</div>}</td>
              <td className="py-1.5 text-right">{i.quantity.toLocaleString("de-DE")} {i.unit}</td>
              <td className="py-1.5 text-right">{eur(i.unitPrice)}</td>
              <td className="py-1.5 text-right">{eur(i.quantity * i.unitPrice)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="ml-auto mt-4 w-64 space-y-1">
        <div className="flex justify-between"><span>Netto</span><span>{eur(net)}</span></div>
        <div className="flex justify-between"><span>MwSt. {o.vatRate.toLocaleString("de-DE")} %</span><span>{eur(vat)}</span></div>
        <div className="flex justify-between border-t-2 border-black pt-1 font-bold"><span>Gesamt</span><span>{eur(net + vat)}</span></div>
      </div>
      <p className="mt-8 whitespace-pre-line">{o.outro}</p>
      <p className="mt-4">Mit freundlichen Grüßen<br />{s.firma_name}</p>
      <p className="mt-12 border-t border-neutral-300 pt-2 text-center text-[10px] text-neutral-500">{s.firma_name} · {s.firma_kontakt} · {s.firma_bank}</p>
    </div>
  );
}
