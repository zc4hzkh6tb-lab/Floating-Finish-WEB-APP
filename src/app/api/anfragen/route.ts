import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { bookingSchema } from "@/lib/booking";

export async function POST(req: Request) {
  const parsed = bookingSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Angaben", issues: parsed.error.issues }, { status: 400 });
  }
  const { event, setup, addons, ledWall, answers } = parsed.data;

  const questions = await prisma.customQuestion.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  for (const q of questions) {
    if (q.required && !answers[q.id]?.trim()) return NextResponse.json({ error: `Bitte beantworten: ${q.label}` }, { status: 400 });
  }
  const customAnswers = questions
    .filter((q) => answers[q.id]?.trim())
    .map((q) => ({ label: q.label, answer: q.type === "YESNO" ? (answers[q.id] === "ja" ? "Ja" : "Nein") : answers[q.id].trim() }));

  const [pkg, series, addonRows] = await Promise.all([
    prisma.package.findUnique({ where: { code: setup.packageCode }, include: { includedAddons: { include: { addon: true } } } }),
    prisma.series.findMany({ where: { code: { in: event.seriesCodes } } }),
    prisma.addon.findMany({ where: { code: { in: addons.map((a) => a.code) } } }),
  ]);
  if (!pkg) return NextResponse.json({ error: "Unbekanntes Paket" }, { status: 400 });

  const included = new Set(pkg.includedAddons.map((ia) => ia.addon.code));
  const dayKeys = new Set(event.days.map((d) => d.key));
  const chosen = addons.filter((a) => !included.has(a.code));
  for (const a of chosen) {
    if (!addonRows.some((r) => r.code === a.code)) return NextResponse.json({ error: `Unbekanntes Add-on ${a.code}` }, { status: 400 });
    if (a.dayKeys.some((k) => !dayKeys.has(k))) return NextResponse.json({ error: "Ungültiger Tag bei Add-on" }, { status: 400 });
  }
  const wantsLedWall = chosen.some((a) => addonRows.find((r) => r.code === a.code)?.isLedWall);
  if (wantsLedWall && !ledWall) return NextResponse.json({ error: "Angaben zur LED-Wand fehlen" }, { status: 400 });

  const booking = await prisma.$transaction(async (tx) => {
    const b = await tx.bookingRequest.create({
      data: {
        organizer: event.organizer,
        contactName: event.contactName,
        contactEmail: event.contactEmail,
        contactPhone: event.contactPhone || null,
        eventName: event.eventName,
        eventLocation: event.eventLocation,
        expectedVisitors: event.expectedVisitors ?? null,
        classes: event.classes,
        otherSeries: event.otherSeries || null,
        catering: event.catering || null,
        accommodation: event.accommodation || null,
        internet: event.internet || null,
        notes: event.notes || null,
        customAnswers: customAnswers.length ? customAnswers : undefined,
        perspectives: setup.perspectives,
        speakers: setup.speakers,
        ledPlayout: setup.ledPlayout,
        packageId: pkg.id,
        series: { create: series.map((s) => ({ seriesId: s.id })) },
      },
    });
    const dayIds = new Map<string, string>();
    for (const d of event.days) {
      const row = await tx.bookingDay.create({
        data: { bookingId: b.id, date: new Date(d.date + "T00:00:00Z"), startTime: d.startTime, endTime: d.endTime, note: d.note || null },
      });
      dayIds.set(d.key, row.id);
    }
    for (const a of chosen) {
      const addon = addonRows.find((r) => r.code === a.code)!;
      await tx.bookingAddon.create({
        data: { bookingId: b.id, addonId: addon.id, days: { create: a.dayKeys.map((k) => ({ dayId: dayIds.get(k)! })) } },
      });
    }
    if (wantsLedWall && ledWall) {
      await tx.ledWallRequest.create({
        data: { bookingId: b.id, count: ledWall.count, size: ledWall.size, placements: ledWall.placements, hasMount: ledWall.hasMount, mountInfo: ledWall.mountInfo || null },
      });
    }
    await tx.bookingEvent.create({ data: { bookingId: b.id, actor: "Kunde", text: "Anfrage über die Buchungsseite eingegangen" } });
    return b;
  });

  return NextResponse.json({ id: booking.id, number: booking.number }, { status: 201 });
}
