import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { fmtDay } from "@/lib/labels";
import { savePerson } from "../actions";
import { Back, Card, L, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";

function Picks({ name, label, all, selected }: { name: string; label: string; all: { id: string; name: string }[]; selected: string[] }) {
  return (
    <div className="sm:col-span-4">
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {all.map((i) => (
          <label key={i.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={name} value={i.id} defaultChecked={selected.includes(i.id)} className="size-4 accent-amber-500" />{i.name}</label>
        ))}
        {all.length === 0 && <span className="text-xs text-neutral-500">Noch keine Einträge in den Stammdaten.</span>}
      </div>
    </div>
  );
}

export default async function PersonPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [p, positions, quals, lics] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: { positions: true, qualifications: true, licenses: true, staffRequests: { orderBy: { createdAt: "desc" }, include: { booking: true, days: { include: { day: true } } } } },
    }),
    prisma.position.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.qualification.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.licenseClass.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!p) notFound();
  const v = (x: string | null) => x ?? "";
  return (
    <Page title={p.name} intro={<Back href="/backoffice/personal" label="Personal" />}>
      <Card>
        <form action={savePerson} className="grid gap-3 sm:grid-cols-4">
          <input type="hidden" name="id" value={p.id} />
          <L label="Name"><input name="name" defaultValue={p.name} className="input" /></L>
          <L label="E-Mail"><input name="email" defaultValue={v(p.email)} className="input" /></L>
          <L label="Telefon"><input name="phone" defaultValue={v(p.phone)} className="input" /></L>
          <L label="Geburtsdatum"><input name="birthDate" type="date" defaultValue={p.birthDate?.toISOString().slice(0, 10) ?? ""} className="input" /></L>
          <L label="Straße"><input name="street" defaultValue={v(p.street)} className="input" /></L>
          <L label="PLZ"><input name="zip" defaultValue={v(p.zip)} className="input" /></L>
          <L label="Ort"><input name="city" defaultValue={v(p.city)} className="input" /></L>
          <L label="Land"><input name="country" defaultValue={v(p.country)} className="input" /></L>
          <L label="Notfallkontakt" className="sm:col-span-2"><input name="emergencyContact" defaultValue={v(p.emergencyContact)} className="input" /></L>
          <L label="Beschäftigung"><input name="employment" defaultValue={v(p.employment)} className="input" placeholder="Festanstellung, Minijob, Freelancer …" /></L>
          <L label="Tagessatz (€, intern)"><input name="dayRate" type="number" step="0.01" defaultValue={p.dayRate ?? ""} className="input" /></L>
          <Picks name="positions" label="Positionen, die besetzt werden können" all={positions} selected={p.positions.map((x) => x.id)} />
          <Picks name="qualifications" label="Qualifikationen" all={quals} selected={p.qualifications.map((x) => x.id)} />
          <Picks name="licenses" label="Führerscheine" all={lics} selected={p.licenses.map((x) => x.id)} />
          <L label="Position im Steckbrief (Freitext)" className="sm:col-span-2"><input name="position" defaultValue={v(p.position)} className="input" /></L>
          <L label="Fähigkeiten (Steckbrief)" className="sm:col-span-2"><input name="skills" defaultValue={v(p.skills)} className="input" /></L>
          <L label="Über mich (Steckbrief)" className="sm:col-span-2"><textarea name="bio" rows={2} defaultValue={v(p.bio)} className="input" /></L>
          <L label="Interne Notizen (nur Backoffice)" className="sm:col-span-2"><textarea name="internalNotes" rows={2} defaultValue={v(p.internalNotes)} className="input" /></L>
          <div className="sm:col-span-4"><SaveButton /></div>
        </form>
      </Card>
      <h2 className="pt-4 text-lg font-semibold">Einsätze</h2>
      <Card>
        {p.staffRequests.length === 0 && <p className="text-sm text-neutral-500">Noch keine Anfragen.</p>}
        <ul className="space-y-1 text-sm">
          {p.staffRequests.map((r) => (
            <li key={r.id}>
              <Link href={`/backoffice/anfragen/${r.bookingId}`} className="text-amber-400">#{r.booking.number} {r.booking.eventName}</Link> · {r.task} · {r.days.map((d) => fmtDay(d.day.date)).join(", ")} · <span className="text-neutral-400">{r.status.toLowerCase()}</span>
            </li>
          ))}
        </ul>
      </Card>
    </Page>
  );
}
