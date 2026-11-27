import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import QuickForm from "./QuickForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schnellanfrage" };

export default async function SchnellPage() {
  const [series, s] = await Promise.all([prisma.series.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }), getSettings()]);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-2xl font-bold">Schnellanfrage</h1>
      <p className="mt-1 mb-6 text-neutral-400">{s.schnellanfrage_text} <Link href="/buchen" className="text-amber-400">Lieber alles im Detail angeben?</Link></p>
      <QuickForm series={series.map((x) => ({ code: x.code, name: x.name, color: x.color }))} />
    </div>
  );
}
