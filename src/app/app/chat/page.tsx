import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { isBackoffice, visibleChannels } from "@/lib/access";
import { createChannel } from "../team-actions";
import { Box, Empty, H } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Chats" };

export default async function ChatsPage() {
  const user = await requireUser();
  const channels = (await visibleChannels(user)).sort((a, b) => +(b.messages[0]?.createdAt ?? b.createdAt) - +(a.messages[0]?.createdAt ?? a.createdAt));
  return (
    <div>
      <H>Gruppenchats</H>
      {channels.length === 0 && <Empty>Noch keine Chats.</Empty>}
      {channels.map((c) => {
        const last = c.messages[0];
        return (
          <Link key={c.id} href={`/app/chat/${c.id}`} className="block">
            <Box className="hover:border-amber-500">
              <div className="flex justify-between gap-2"><span className="font-semibold">{c.bookingId ? "🎬 " : "💬 "}{c.name}</span>{last && <span className="text-xs text-neutral-500">{last.createdAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</span>}</div>
              <p className="truncate text-sm text-neutral-400">{last ? `${last.user.name.split(" ")[0]}: ${last.text}` : "Noch keine Nachrichten"}</p>
            </Box>
          </Link>
        );
      })}
      {isBackoffice(user) && (
        <Box>
          <form action={createChannel} className="flex gap-2">
            <input name="name" className="input" placeholder="Neuer Gruppenchat, z. B. Technik" required />
            <button className="btn-ghost whitespace-nowrap">Anlegen</button>
          </form>
          <p className="mt-2 text-xs text-neutral-500">Projekt-Chats eröffnest du im Backoffice an der Anfrage. Dort sehen nur angefragte Teammitglieder mit.</p>
        </Box>
      )}
    </div>
  );
}
