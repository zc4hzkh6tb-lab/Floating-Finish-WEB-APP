import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/session";
import { updateProfile } from "../actions";
import { Box, H } from "../ui";
import PasswordForm from "./PasswordForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Profil" };

export default async function ProfilPage({ searchParams }: { searchParams: Promise<{ neu?: string }> }) {
  const user = await requireUser();
  const { neu } = await searchParams;
  return (
    <div>
      {(neu || user.mustChangePassword) && (
        <div className="mx-4 mt-4 rounded-xl border border-amber-500 bg-amber-500/10 p-3 text-sm">Willkommen! Bitte vergib zuerst ein eigenes Passwort.</div>
      )}
      <H>Passwort ändern</H>
      <Box><PasswordForm /></Box>

      <H>Mein Steckbrief</H>
      <Box>
        <p className="mb-3 text-xs text-neutral-500">{user.name} · Login: {user.username} · {ROLE_LABEL[user.role]}</p>
        <form action={updateProfile} className="space-y-3">
          <label className="block"><span className="mb-1 block text-sm text-neutral-400">Position</span><input name="position" defaultValue={user.position ?? ""} className="input" placeholder="z. B. Kamera, Regie" /></label>
          <label className="block"><span className="mb-1 block text-sm text-neutral-400">Kann ich</span><input name="skills" defaultValue={user.skills ?? ""} className="input" placeholder="z. B. Drohne (A2-Schein), Kran, Schnitt" /></label>
          <label className="block"><span className="mb-1 block text-sm text-neutral-400">Über mich</span><textarea name="bio" rows={3} defaultValue={user.bio ?? ""} className="input" /></label>
          <label className="block"><span className="mb-1 block text-sm text-neutral-400">Telefon</span><input name="phone" type="tel" defaultValue={user.phone ?? ""} className="input" /></label>
          <label className="block"><span className="mb-1 block text-sm text-neutral-400">E-Mail</span><input name="email" type="email" defaultValue={user.email ?? ""} className="input" /></label>
          <button className="btn-primary w-full">Speichern</button>
        </form>
      </Box>

      <form action="/logout" method="post" className="px-4 pt-4">
        <button className="btn-ghost w-full">Abmelden</button>
      </form>
    </div>
  );
}
