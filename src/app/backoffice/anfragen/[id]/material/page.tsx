import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDay } from "@/lib/labels";
import { PrintButton } from "../../../PrintButton";

export const dynamic = "force-dynamic";

export default async function MaterialPrint({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const b = await prisma.bookingRequest.findUnique({ where: { id }, include: { days: { orderBy: { date: "asc" } }, materials: { include: { article: { include: { category: true } } }, orderBy: { name: "asc" } } } });
  if (!b) notFound();
  const groups = new Map<string, typeof b.materials>();
  for (const m of b.materials) {
    const k = m.article?.category?.name ?? "Sonstiges";
    groups.set(k, [...(groups.get(k) ?? []), m]);
  }
  return (
    <div className="mx-auto max-w-3xl bg-white px-8 py-8 text-black print:p-0">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Materialliste #{b.number}</h1>
          <p>{b.eventName} · {b.eventLocation}</p>
          <p className="text-sm">{b.days.map((d) => fmtDay(d.date)).join(", ")}</p>
        </div>
        <PrintButton />
      </div>
      {[...groups].map(([cat, items]) => (
        <div key={cat} className="mt-6">
          <h2 className="border-b border-black font-semibold">{cat}</h2>
          <table className="w-full text-sm">
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-b border-neutral-300">
                  <td className="w-8 py-1">☐</td>
                  <td className="w-14 py-1 text-right pr-3">{m.quantity}×</td>
                  <td className="py-1">{m.name}{m.note ? <span className="text-neutral-600"> – {m.note}</span> : null}</td>
                  <td className="py-1 text-right text-xs text-neutral-500">{m.article?.storage ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}
