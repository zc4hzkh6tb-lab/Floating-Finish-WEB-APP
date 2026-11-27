"use client";

export function PrintButton({ label = "Drucken / PDF" }: { label?: string }) {
  return <button onClick={() => window.print()} className="rounded border border-neutral-400 px-3 py-1 text-sm print:hidden">{label}</button>;
}
