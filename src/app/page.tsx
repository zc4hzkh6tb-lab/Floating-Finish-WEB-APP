import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto flex min-h-[80vh] max-w-3xl flex-col items-center justify-center px-4 text-center">
      <p className="text-sm uppercase tracking-widest text-amber-400">Livestream für Tractor Pulling</p>
      <h1 className="mt-4 text-4xl font-bold sm:text-5xl">Deine Veranstaltung live übertragen</h1>
      <p className="mt-6 text-lg text-neutral-400">Setup wählen, Add-ons pro Tag dazubuchen, Anfrage senden. Wir planen den Rest.</p>
      <Link href="/buchen" className="btn-primary mt-10">Jetzt Stream anfragen</Link>
    </div>
  );
}
