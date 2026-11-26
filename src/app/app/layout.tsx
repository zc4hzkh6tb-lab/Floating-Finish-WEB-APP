import Link from "next/link";
import { requireUser } from "@/lib/auth";

export const metadata = { title: { default: "Team-App", template: "%s · Team-App" } };

const tabs = [
  ["/app", "Start"],
  ["/app/kalender", "Kalender"],
  ["/app/team", "Team"],
  ["/app/profil", "Profil"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="mx-auto min-h-[calc(100vh-57px)] max-w-xl pb-24">
      <div className="flex items-center justify-between px-4 pt-4 text-sm text-neutral-400">
        <span>Hallo {user.name.split(" ")[0]}</span>
        {user.role !== "TEAM" && <Link href="/backoffice" className="text-amber-400">Zum Backoffice</Link>}
      </div>
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-neutral-800 bg-neutral-950/95 backdrop-blur" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <div className="mx-auto grid max-w-xl grid-cols-4">
          {tabs.map(([href, label]) => (
            <Link key={href} href={href} className="py-3 text-center text-sm text-neutral-300 hover:text-amber-400">{label}</Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
