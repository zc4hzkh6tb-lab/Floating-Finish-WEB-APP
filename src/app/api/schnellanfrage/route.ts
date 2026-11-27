import { NextResponse } from "next/server";
import { createQuickRequest, quickSchema } from "@/lib/quick";

export async function POST(req: Request) {
  const parsed = quickSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Ungültige Angaben" }, { status: 400 });
  if (!parsed.data.contactEmail && !parsed.data.contactPhone) return NextResponse.json({ error: "Bitte E-Mail oder Telefon angeben" }, { status: 400 });
  const b = await createQuickRequest(parsed.data, "SCHNELL", "Kunde");
  return NextResponse.json({ number: b.number }, { status: 201 });
}
