"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "../../team-actions";

export default function ChatBox({ channelId }: { channelId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [pending, start] = useTransition();
  useEffect(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <form
      className="fixed inset-x-0 bottom-[49px] z-10 border-t border-neutral-800 bg-neutral-950 p-2"
      onSubmit={(e) => {
        e.preventDefault();
        const t = text;
        setText("");
        start(async () => {
          await sendMessage(channelId, t);
          router.refresh();
          setTimeout(() => window.scrollTo(0, document.body.scrollHeight), 300);
        });
      }}
    >
      <div className="mx-auto flex max-w-xl gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} className="input" placeholder="Nachricht …" aria-label="Nachricht" />
        <button className="btn-primary !px-4" disabled={pending || !text.trim()}>Senden</button>
      </div>
    </form>
  );
}
