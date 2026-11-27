import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { canSeeChannel } from "@/lib/access";
import ChatBox from "./ChatBox";

export const dynamic = "force-dynamic";

export default async function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const ch = await canSeeChannel(user, id);
  if (!ch) notFound();
  const messages = await prisma.chatMessage.findMany({ where: { channelId: id }, orderBy: { createdAt: "asc" }, take: 300, include: { user: true } });
  return (
    <div className="pb-20">
      <div className="px-4 pt-3">
        <Link href="/app/chat" className="text-sm text-neutral-400">← Chats</Link>
        <h1 className="text-xl font-bold">{ch.name}</h1>
        {ch.bookingId && <Link href={`/app/projekt/${ch.bookingId}`} className="text-sm text-amber-400">Zum Projekt</Link>}
      </div>
      <div className="mt-3 space-y-2 px-4">
        {messages.length === 0 && <p className="text-sm text-neutral-500">Schreib die erste Nachricht.</p>}
        {messages.map((m) => {
          const mine = m.userId === user.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : ""}`}>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${mine ? "bg-amber-500 text-black" : "bg-neutral-800"}`}>
                {!mine && <div className="text-xs font-semibold text-amber-300">{m.user.name}</div>}
                <div className="whitespace-pre-wrap break-words">{m.text}</div>
                <div className={`mt-0.5 text-[10px] ${mine ? "text-black/60" : "text-neutral-500"}`}>{m.createdAt.toLocaleString("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
              </div>
            </div>
          );
        })}
      </div>
      <ChatBox channelId={id} />
    </div>
  );
}
