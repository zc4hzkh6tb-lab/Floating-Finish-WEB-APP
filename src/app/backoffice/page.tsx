import Link from "next/link";
import { prisma } from "@/lib/db";
import { STATUS_LABEL, fmtDay } from "@/lib/labels";

export const dynamic = "force-dynamic";
export const metadata = { title: "Backoffice" };

export default async function BackofficePage() {
  const bookings = await prisma.bookingRequest.findMany({
    orderBy: { createdAt: "desc" },
    include: { days: { orderBy: { date: "asc" } }, package: true, series: { include: { series: true } }, _count: { select: { addons: true } } },
  });
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-2xl font-bold">Anfragen</h1>
      <p className="mt-1 text-sm text-neutral-400">{bookings.length} Anfragen</p>
      <div className="mt-6 overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-900 text-neutral-400">
            <tr>
              <th className="p-3">Nr.</th><th className="p-3">VA</th><th className="p-3">Termin</th><th className="p-3">Serie</th><th className="p-3">Paket</th><th className="p-3">Add-ons</th><th className="p-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((b) => (
              <tr key={b.id} className="border-t border-neutral-800 hover:bg-neutral-900/60">
                <td className="p-3"><Link className="text-amber-400 hover:underline" href={`/backoffice/anfragen/${b.id}`}>#{b.number}</Link></td>
                <td className="p-3"><div className="font-medium">{b.eventName}</div><div className="text-neutral-500">{b.eventLocation}</div></td>
                <td className="p-3">{b.days[0] ? fmtDay(b.days[0].date) : "–"}{b.days.length > 1 && <span className="text-neutral-500"> +{b.days.length - 1} Tage</span>}</td>
                <td className="p-3">{b.series.map((s) => s.series.code).join(", ") || "–"}</td>
                <td className="p-3">{b.package?.name ?? "–"}</td>
                <td className="p-3">{b._count.addons}</td>
                <td className="p-3">{STATUS_LABEL[b.status]}</td>
              </tr>
            ))}
            {bookings.length === 0 && <tr><td colSpan={7} className="p-6 text-center text-neutral-500">Noch keine Anfragen</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
