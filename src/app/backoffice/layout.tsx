import Link from "next/link";
import { requireBackoffice } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/session";

const nav = [
  ["/backoffice", "Anfragen"],
  ["/backoffice/stammdaten/pakete", "Pakete"],
  ["/backoffice/stammdaten/addons", "Add-ons"],
  ["/backoffice/stammdaten/serien", "Serien"],
  ["/backoffice/stammdaten/klassen", "Klassen"],
  ["/backoffice/stammdaten/led-groessen", "LED-Größen"],
  ["/backoffice/fragen", "Eigene Fragen"],
];

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const user = await requireBackoffice();
  const items = user.role === "ADMIN" ? [...nav, ["/backoffice/nutzer", "Nutzer"]] : nav;
  return (
    <div>
      <nav className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="mx-auto flex max-w-5xl items-center gap-1 px-4 py-2 text-sm">
          <div className="flex flex-1 gap-1 overflow-x-auto">
            {items.map(([href, label]) => (
              <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white">
                {label}
              </Link>
            ))}
          </div>
          <span className="hidden whitespace-nowrap text-xs text-neutral-500 sm:inline">{user.name} · {ROLE_LABEL[user.role]}</span>
          <form action="/logout" method="post">
            <button className="whitespace-nowrap rounded-md px-3 py-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-white">Abmelden</button>
          </form>
        </div>
      </nav>
      {children}
    </div>
  );
}
