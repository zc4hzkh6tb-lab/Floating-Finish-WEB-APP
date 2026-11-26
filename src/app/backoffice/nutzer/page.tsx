import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/session";
import { Card, Check, L, NewTitle, Page, SaveButton } from "../ui";
import { createUser, resetPassword, updateUser } from "./actions";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nutzer" };

const ROLE_HELP = "Admin: alles inkl. Nutzerverwaltung · Planung: Backoffice ohne Nutzerverwaltung · Team: nur Team-App";

function RoleSelect({ value, disabled }: { value?: string; disabled?: boolean }) {
  return (
    <select name="role" defaultValue={value ?? "TEAM"} disabled={disabled} className="input">
      {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
    </select>
  );
}

export default async function NutzerPage() {
  const me = await requireAdmin();
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { name: "asc" }] });
  return (
    <Page title="Nutzer" intro={ROLE_HELP}>
      <Card>
        <NewTitle>Neuer Nutzer</NewTitle>
        <form action={createUser} className="grid gap-3 sm:grid-cols-4">
          <L label="Name"><input name="name" className="input" required /></L>
          <L label="Benutzername (Login)"><input name="username" className="input" autoCapitalize="none" required /></L>
          <L label="Rolle"><RoleSelect /></L>
          <L label="Startpasswort (min. 8 Zeichen)"><input name="password" type="text" minLength={8} className="input" required /></L>
          <L label="E-Mail"><input name="email" type="email" className="input" /></L>
          <L label="Telefon"><input name="phone" className="input" /></L>
          <L label="Position" className="sm:col-span-2"><input name="position" className="input" placeholder="z. B. Kamera, Regie, Technik" /></L>
          <div className="sm:col-span-4"><SaveButton label="Anlegen" /></div>
        </form>
        <p className="mt-2 text-xs text-neutral-500">Beim ersten Login muss der Nutzer das Startpasswort ändern.</p>
      </Card>
      {users.map((u) => (
        <Card key={u.id} muted={!u.active}>
          <form action={updateUser} className="grid gap-3 sm:grid-cols-4">
            <input type="hidden" name="id" value={u.id} />
            <L label={`Name · Login: ${u.username}`}><input name="name" defaultValue={u.name} className="input" /></L>
            <L label="Rolle"><RoleSelect value={u.role} disabled={u.id === me.id} /></L>
            <L label="E-Mail"><input name="email" defaultValue={u.email ?? ""} className="input" /></L>
            <L label="Telefon"><input name="phone" defaultValue={u.phone ?? ""} className="input" /></L>
            <L label="Position" className="sm:col-span-2"><input name="position" defaultValue={u.position ?? ""} className="input" /></L>
            <div className="flex items-end gap-4 pb-1 sm:col-span-2">
              {u.id !== me.id && <Check name="active" label="Zugang aktiv" defaultChecked={u.active} />}
              {u.mustChangePassword && <span className="text-xs text-amber-400">Startpasswort noch nicht geändert</span>}
              <SaveButton />
            </div>
          </form>
          <form action={resetPassword} className="mt-3 flex flex-wrap items-end gap-2 border-t border-neutral-800 pt-3">
            <input type="hidden" name="id" value={u.id} />
            <L label="Neues Startpasswort"><input name="password" type="text" minLength={8} className="input" required /></L>
            <button className="btn-ghost">Passwort zurücksetzen</button>
          </form>
        </Card>
      ))}
    </Page>
  );
}
