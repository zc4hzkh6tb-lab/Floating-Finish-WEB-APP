export function Page({ title, intro, children, actions }: { title: string; intro?: React.ReactNode; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <h1 className="text-2xl font-bold">{title}</h1>
        {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
      </div>
      {intro && <div className="mt-1 text-sm text-neutral-400">{intro}</div>}
      <div className="mt-6 space-y-4">{children}</div>
    </div>
  );
}

export function Card({ children, muted }: { children: React.ReactNode; muted?: boolean }) {
  return <div className={`rounded-xl border p-4 ${muted ? "border-neutral-800 opacity-60" : "border-neutral-700"}`}>{children}</div>;
}

export function L({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs text-neutral-400">{label}</span>
      {children}
    </label>
  );
}

export function Check({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4 accent-amber-500" />
      {label}
    </label>
  );
}

export function SaveButton({ label = "Speichern" }: { label?: string }) {
  return <button type="submit" className="btn-primary !px-4 !py-2 text-sm">{label}</button>;
}

export function DeleteButton({ action, id, label = "Löschen" }: { action: (f: FormData) => Promise<void>; id: string; label?: string }) {
  return (
    <form action={action}>
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-ghost !border-red-900 text-red-400 hover:!border-red-600">{label}</button>
    </form>
  );
}

export const NewTitle = ({ children }: { children: React.ReactNode }) => <h2 className="mb-3 font-semibold text-amber-400">{children}</h2>;

export const Back = ({ href, label }: { href: string; label: string }) => (
  <a href={href} className="text-amber-400 hover:underline">← {label}</a>
);
