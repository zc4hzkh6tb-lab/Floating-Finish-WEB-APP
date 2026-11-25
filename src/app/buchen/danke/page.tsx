import Link from "next/link";

export default async function DankePage({ searchParams }: { searchParams: Promise<{ nr?: string }> }) {
  const { nr } = await searchParams;
  return (
    <div className="mx-auto max-w-xl px-4 py-20 text-center">
      <h1 className="text-3xl font-bold">Danke für deine Anfrage!</h1>
      {nr && <p className="mt-4 text-neutral-400">Anfrage-Nr. {nr}</p>}
      <p className="mt-4 text-neutral-300">Wir melden uns mit einem Angebot bei dir.</p>
      <Link href="/" className="btn-ghost mt-8 inline-block">Zur Startseite</Link>
    </div>
  );
}
