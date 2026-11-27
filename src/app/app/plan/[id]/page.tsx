import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeBooking, isBackoffice } from "@/lib/access";
import PlanEditor, { type PlanData } from "@/components/PlanEditor";

export const dynamic = "force-dynamic";

export default async function PlanView({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) notFound();
  const ok = isBackoffice(user) || (plan.visibleToTeam && plan.bookingId && (await canSeeBooking(user, plan.bookingId)));
  if (!ok) notFound();
  return (
    <div className="px-2 pt-3">
      {plan.bookingId && <Link href={`/app/projekt/${plan.bookingId}`} className="px-2 text-sm text-neutral-400">← Projekt</Link>}
      <h1 className="px-2 pb-3 text-xl font-bold">{plan.name}</h1>
      <PlanEditor symbols={[]} initial={plan.data as PlanData} readOnly />
    </div>
  );
}
