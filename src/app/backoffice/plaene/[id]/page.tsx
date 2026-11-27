import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import PlanEditor, { type PlanData } from "@/components/PlanEditor";
import { deletePlan, savePlanData, savePlanMeta } from "../actions";
import { Back, Card, L, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";

export default async function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [plan, symbols, bookings] = await Promise.all([
    prisma.plan.findUnique({ where: { id } }),
    prisma.planSymbol.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.bookingRequest.findMany({ orderBy: { createdAt: "desc" }, take: 100, select: { id: true, number: true, eventName: true } }),
  ]);
  if (!plan) notFound();
  async function save(d: PlanData) {
    "use server";
    await savePlanData(id, d);
  }
  return (
    <Page title={plan.name} intro={<Back href={plan.bookingId ? `/backoffice/anfragen/${plan.bookingId}` : "/backoffice/plaene"} label={plan.bookingId ? "Zur Anfrage" : "Pläne"} />}>
      <PlanEditor symbols={symbols} initial={plan.data as PlanData} onSave={save} />
      <Card>
        <form action={savePlanMeta} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="id" value={plan.id} />
          <L label="Name" className="min-w-48 flex-1"><input name="name" defaultValue={plan.name} className="input" /></L>
          <L label="Anfrage">
            <select name="bookingId" defaultValue={plan.bookingId ?? ""} className="input">
              <option value="">– keine (Vorlage) –</option>
              {bookings.map((b) => <option key={b.id} value={b.id}>#{b.number} {b.eventName}</option>)}
            </select>
          </L>
          <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="visibleToTeam" defaultChecked={plan.visibleToTeam} className="size-4 accent-amber-500" />Team sieht den Plan</label>
          <SaveButton />
        </form>
      </Card>
      <form action={deletePlan}><input type="hidden" name="id" value={plan.id} /><button className="btn-ghost !border-red-900 text-red-400">Plan löschen</button></form>
    </Page>
  );
}
