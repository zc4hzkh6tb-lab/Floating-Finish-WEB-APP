import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireBackoffice } from "@/lib/auth";
import { SETTINGS, getSettings, type SettingKey } from "@/lib/settings";
import { Card, L, Page, SaveButton } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Einstellungen" };

async function save(f: FormData) {
  "use server";
  await requireBackoffice();
  for (const key of Object.keys(SETTINGS)) {
    const value = String(f.get(key) ?? "");
    await prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
  }
  revalidatePath("/", "layout");
}

export default async function SettingsPage() {
  const s = await getSettings();
  return (
    <Page title="Einstellungen" intro="Firmendaten für Angebote und Texte, die in der Buchung erscheinen.">
      <Card>
        <form action={save} className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(SETTINGS) as SettingKey[]).map((k) => (
            <L key={k} label={SETTINGS[k].label} className={SETTINGS[k].long ? "sm:col-span-2" : ""}>
              {SETTINGS[k].long ? <textarea name={k} defaultValue={s[k]} rows={3} className="input" /> : <input name={k} defaultValue={s[k]} className="input" />}
            </L>
          ))}
          <div><SaveButton /></div>
        </form>
      </Card>
    </Page>
  );
}
