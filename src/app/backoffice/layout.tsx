import Link from "next/link";

const nav = [
  ["/backoffice", "Anfragen"],
  ["/backoffice/stammdaten/pakete", "Pakete"],
  ["/backoffice/stammdaten/addons", "Add-ons"],
  ["/backoffice/stammdaten/serien", "Serien"],
  ["/backoffice/stammdaten/klassen", "Klassen"],
  ["/backoffice/stammdaten/led-groessen", "LED-Größen"],
  ["/backoffice/fragen", "Eigene Fragen"],
];

export default function BackofficeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <nav className="border-b border-neutral-800 bg-neutral-900/50">
        <div className="mx-auto flex max-w-5xl gap-1 overflow-x-auto px-4 py-2 text-sm">
          {nav.map(([href, label]) => (
            <Link key={href} href={href} className="whitespace-nowrap rounded-md px-3 py-1.5 text-neutral-300 hover:bg-neutral-800 hover:text-white">
              {label}
            </Link>
          ))}
        </div>
      </nav>
      {children}
    </div>
  );
}
