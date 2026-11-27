import Link from "next/link";
import { requireBackoffice } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/session";

type Item = [href: string, label: string];
const groups: [string, Item[]][] = [
  ["Aufträge", [["/backoffice", "Anfragen"], ["/backoffice/schnellanfrage", "Schnellanfrage"], ["/backoffice/angebote", "Angebote"], ["/backoffice/plaene", "Pläne"]]],
  ["Kontakte", [["/backoffice/daten/veranstalter", "Veranstalter"], ["/backoffice/daten/locations", "Locations"]]],
  ["Lager & Technik", [["/backoffice/inventar", "Inventar"], ["/backoffice/anlagen", "Anlagen"], ["/backoffice/daten/artikelkategorien", "Artikelkategorien"]]],
  ["Personal", [["/backoffice/personal", "Personal"], ["/backoffice/daten/positionen", "Positionen"], ["/backoffice/daten/qualifikationen", "Qualifikationen"], ["/backoffice/daten/fuehrerscheine", "Führerscheine"], ["/backoffice/daten/checklisten", "Checklisten-Vorlagen"]]],
  [
    "Buchungstool",
    [
      ["/backoffice/stammdaten/pakete", "Pakete"],
      ["/backoffice/stammdaten/addons", "Add-ons"],
      ["/backoffice/daten/regeln", "Regeln"],
      ["/backoffice/stammdaten/serien", "Serien"],
      ["/backoffice/stammdaten/klassen", "Klassen"],
      ["/backoffice/daten/led-bespielung", "LED-Bespielung"],
      ["/backoffice/stammdaten/led-groessen", "LED-Größen"],
      ["/backoffice/fragen", "Eigene Fragen"],
    ],
  ],
  ["Auswertung", [["/backoffice/auswertungen", "Auswertungen"]]],
  ["System", [["/backoffice/einstellungen", "Einstellungen"], ["/backoffice/daten/plan-symbole", "Plan-Symbole"]]],
];

function Nav({ admin }: { admin: boolean }) {
  return (
    <nav className="space-y-4 text-sm">
      {groups.map(([title, items]) => {
        const all = title === "System" && admin ? [...items, ["/backoffice/nutzer", "Nutzer & Zugänge"] as Item] : items;
        return (
          <div key={title}>
            <div className="mb-1 px-3 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</div>
            {all.map(([href, label]) => (
              <Link key={href} href={href} className="block rounded-md px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );
}

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireBackoffice();
  const admin = user.role === "ADMIN";
  return (
    <div className="lg:flex">
      <aside className="print:hidden border-b border-neutral-800 bg-neutral-900/50 lg:sticky lg:top-0 lg:h-screen lg:w-56 lg:shrink-0 lg:overflow-y-auto lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between px-4 py-3 lg:block">
          <div>
            <div className="font-semibold">Backoffice</div>
            <div className="text-xs text-neutral-500">{user.name} · {ROLE_LABEL[user.role]}</div>
          </div>
          <form action="/logout" method="post" className="lg:mt-2">
            <button className="rounded-md px-0 py-1 text-xs text-neutral-400 hover:text-white">Abmelden</button>
          </form>
        </div>
        <details className="px-2 pb-3 lg:hidden">
          <summary className="cursor-pointer rounded-md px-3 py-1.5 text-sm text-amber-400">Menü</summary>
          <div className="mt-2"><Nav admin={admin} /></div>
        </details>
        <div className="hidden px-2 pb-6 lg:block"><Nav admin={admin} /></div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
