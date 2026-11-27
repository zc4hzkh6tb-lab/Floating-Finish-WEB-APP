import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Floating Finish", template: "%s · Floating Finish" },
  description: "Livestream-Produktion für Tractor-Pulling-Veranstaltungen",
  appleWebApp: { capable: true, title: "FF Team", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-touch-icon.png" },
};

export const viewport = { themeColor: "#0a0a0a" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de">
      <body className="min-h-screen bg-neutral-950 text-neutral-100 antialiased">
        <header className="border-b border-neutral-800 print:hidden">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
            <Link href="/" className="font-bold tracking-tight">Floating<span className="text-amber-400">Finish</span></Link>
            <nav className="flex gap-4 text-sm text-neutral-400">
              <Link href="/buchen" className="hover:text-white">Buchen</Link>
              <Link href="/app" prefetch={false} className="hover:text-white">Team-App</Link>
              <Link href="/backoffice" prefetch={false} className="hover:text-white">Backoffice</Link>
            </nav>
          </div>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
