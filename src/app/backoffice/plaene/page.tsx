import Link from "next/link";
import { prisma } from "@/lib/db";
import { createPlan } from "../job-actions";
import { Card, L, NewTitle, Page, SaveButton } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pläne" };

export default async function PlansPage() {
  const plans = await prisma.plan.findMany({ orderBy: { updatedAt: "desc" }, include: { booking: true } });
  return (
    <Page title="Pläne" intro="Aufbaupläne mit Kamerapositionen, Kabelwegen und Anlage. Symbole pflegst du unter System → Plan-Symbole. Pläne, die für das Team sichtbar sind, erscheinen im Projekt in der Team-App.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((p) => (
          <Link key={p.id} href={`/backoffice/plaene/${p.id}`} className="rounded-xl border border-neutral-700 p-4 hover:border-amber-500">
            <div className="font-semibold">{p.name}</div>
            <div className="text-sm text-neutral-400">{p.booking ? `#${p.booking.number} ${p.booking.eventName}` : "ohne Anfrage (Vorlage)"}</div>
            <div className="text-xs text-neutral-500">geändert {p.updatedAt.toLocaleDateString("de-DE")}</div>
          </Link>
        ))}
      </div>
      <Card>
        <NewTitle>Neuer Plan (z. B. Vorlage für eine Location)</NewTitle>
        <form action={createPlan} className="flex flex-wrap items-end gap-3">
          <L label="Name" className="min-w-64 flex-1"><input name="name" className="input" required /></L>
          <SaveButton label="Anlegen" />
        </form>
      </Card>
    </Page>
  );
}
