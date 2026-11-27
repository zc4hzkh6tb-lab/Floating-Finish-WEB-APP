import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ROLE_LABEL } from "@/lib/session";
import { L, Page } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Personal" };

const age = (d: Date | null) => (d ? Math.floor((Date.now() - d.getTime()) / (365.25 * 864e5)) : null);

export default async function PersonalPage({ searchParams }: { searchParams: Promise<{ pos?: string; qual?: string; lic?: string; q?: string }> }) {
  const sp = await searchParams;
  const where: Prisma.UserWhereInput = {
    ...(sp.q ? { OR: [{ name: { contains: sp.q, mode: "insensitive" } }, { city: { contains: sp.q, mode: "insensitive" } }] } : {}),
    ...(sp.pos ? { positions: { some: { id: sp.pos } } } : {}),
    ...(sp.qual ? { qualifications: { some: { id: sp.qual } } } : {}),
    ...(sp.lic ? { licenses: { some: { id: sp.lic } } } : {}),
  };
  const [people, positions, quals, lics] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [{ active: "desc" }, { name: "asc" }], include: { positions: true, qualifications: true, licenses: true, staffRequests: { where: { status: "ZUGESAGT" }, select: { days: true } } } }),
    prisma.position.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.qualification.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.licenseClass.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const sel = (name: string, value: string | undefined, items: { id: string; name: string }[]) => (
    <select name={name} defaultValue={value ?? ""} className="input"><option value="">alle</option>{items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
  );
  return (
    <Page title="Personal" intro="Personalakte mit Adresse, Qualifikationen, Führerscheinen und Positionen. Neue Personen und Zugänge legt ein Admin unter „Nutzer & Zugänge“ an.">
      <form className="flex flex-wrap items-end gap-3">
        <L label="Suche" className="min-w-48 flex-1"><input name="q" defaultValue={sp.q} className="input" placeholder="Name oder Ort" /></L>
        <L label="Position">{sel("pos", sp.pos, positions)}</L>
        <L label="Qualifikation">{sel("qual", sp.qual, quals)}</L>
        <L label="Führerschein">{sel("lic", sp.lic, lics)}</L>
        <button className="btn-ghost">Filtern</button>
      </form>
      <div className="overflow-x-auto rounded-xl border border-neutral-800">
        <table className="w-full text-sm">
          <thead className="bg-neutral-900 text-left text-xs text-neutral-400">
            <tr><th className="p-2">Name</th><th className="p-2">Ort</th><th className="p-2">Alter</th><th className="p-2">Positionen</th><th className="p-2">Qualifikationen</th><th className="p-2">FS</th><th className="p-2 text-right">Einsatztage</th></tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <tr key={p.id} className={`border-t border-neutral-800 ${p.active ? "" : "opacity-50"}`}>
                <td className="p-2"><Link href={`/backoffice/personal/${p.id}`} className="font-medium text-amber-400 hover:underline">{p.name}</Link><div className="text-xs text-neutral-500">{ROLE_LABEL[p.role]}</div></td>
                <td className="p-2">{p.city ?? "–"}</td>
                <td className="p-2">{age(p.birthDate) ?? "–"}</td>
                <td className="p-2">{p.positions.map((x) => x.name).join(", ") || "–"}</td>
                <td className="p-2">{p.qualifications.map((x) => x.name).join(", ") || "–"}</td>
                <td className="p-2">{p.licenses.map((x) => x.name).join(", ") || "–"}</td>
                <td className="p-2 text-right">{p.staffRequests.reduce((n, r) => n + r.days.length, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Page>
  );
}
