import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";
import { createQuickRequest, quickSchema } from "@/lib/quick";
import { Card, L, Page, SaveButton } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schnellanfrage" };

async function create(f: FormData) {
  "use server";
  const user = await requireBackoffice();
  const g = (k: string) => String(f.get(k) ?? "");
  const parsed = quickSchema.safeParse({
    organizer: g("organizer"), contactName: g("contactName"), contactEmail: g("contactEmail"), contactPhone: g("contactPhone"),
    eventName: g("eventName"), eventLocation: g("eventLocation"), dateFrom: g("dateFrom"), dateTo: g("dateTo"),
    seriesCodes: f.getAll("seriesCodes").map(String), notes: g("notes"),
  });
  if (!parsed.success) redirect(`/backoffice/schnellanfrage?fehler=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Angaben prüfen")}`);
  const b = await createQuickRequest(parsed.data, "INTERN", user.name);
  redirect(`/backoffice/anfragen/${b.id}`);
}

export default async function InternQuickPage({ searchParams }: { searchParams: Promise<{ fehler?: string }> }) {
  const { fehler } = await searchParams;
  const series = await prisma.series.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <Page title="Schnellanfrage erfassen" intro={<>Für Anfragen am Telefon oder per Mail: nur die Eckdaten, der Rest kommt später. Öffentliches Formular für Kunden: <a href="/buchen/schnell" className="text-amber-400">/buchen/schnell</a></>}>
      {fehler && <p className="text-red-400">{fehler}</p>}
      <Card>
        <form action={create} className="grid gap-3 sm:grid-cols-2">
          <L label="Veranstalter"><input name="organizer" className="input" required /></L>
          <L label="Ansprechpartner"><input name="contactName" className="input" required /></L>
          <L label="E-Mail"><input name="contactEmail" type="email" className="input" /></L>
          <L label="Telefon"><input name="contactPhone" className="input" /></L>
          <L label="Name der VA"><input name="eventName" className="input" required /></L>
          <L label="Ort"><input name="eventLocation" className="input" required /></L>
          <L label="Erster Tag"><input name="dateFrom" type="date" className="input" required /></L>
          <L label="Letzter Tag"><input name="dateTo" type="date" className="input" /></L>
          <div className="sm:col-span-2 flex flex-wrap gap-4">
            {series.map((s) => <label key={s.id} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name="seriesCodes" value={s.code} className="size-4 accent-amber-500" />{s.name}</label>)}
          </div>
          <L label="Notizen" className="sm:col-span-2"><textarea name="notes" rows={3} className="input" /></L>
          <div><SaveButton label="Anfrage anlegen" /></div>
        </form>
      </Card>
    </Page>
  );
}
