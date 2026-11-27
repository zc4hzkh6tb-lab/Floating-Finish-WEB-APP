import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { entityByKey, type Field } from "@/lib/entities";
import { deleteEntity, saveEntity } from "../../entity-actions";
import { Card, L, NewTitle, Page, SaveButton } from "../../ui";

export const dynamic = "force-dynamic";

type Opts = { package: [string, string][]; addon: [string, string][]; series: [string, string][] };
type Row = Record<string, unknown> & { id: string };

function Input({ fd, row, opts }: { fd: Field; row?: Row; opts: Opts }) {
  const v = row?.[fd.name];
  switch (fd.type) {
    case "textarea":
      return <textarea name={fd.name} defaultValue={(v as string) ?? ""} rows={2} className="input" required={fd.required} />;
    case "lines":
      return <textarea name={fd.name} defaultValue={((v as string[]) ?? []).join("\n")} rows={5} className="input" />;
    case "number":
    case "float":
      return <input name={fd.name} type="number" step={fd.type === "float" ? "0.01" : "1"} defaultValue={(v as number) ?? (fd.name === "sortOrder" ? 0 : "")} className="input" />;
    case "date":
      return <input name={fd.name} type="date" defaultValue={v instanceof Date ? v.toISOString().slice(0, 10) : ""} className="input" />;
    case "color":
      return <input name={fd.name} type="color" defaultValue={(v as string) ?? "#f59e0b"} className="h-10 w-16 cursor-pointer rounded border border-neutral-700 bg-neutral-900" />;
    case "bool":
      return <input name={fd.name} type="checkbox" defaultChecked={!!v} className="size-4 accent-amber-500" />;
    case "select":
      return (
        <select name={fd.name} defaultValue={(v as string) ?? fd.options?.[0]?.[0]} className="input">
          {fd.options?.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      );
    case "relation":
      return (
        <select name={fd.name} defaultValue={(v as string) ?? ""} className="input">
          <option value="">– keins –</option>
          {opts[fd.relation!].map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      );
    case "multi":
      return (
        <div className="flex flex-wrap gap-3 pt-1">
          {opts[fd.multi!].map(([k, l]) => (
            <label key={k} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" name={fd.name} value={k} defaultChecked={((v as string[]) ?? []).includes(k)} className="size-4 accent-amber-500" />
              {l}
            </label>
          ))}
        </div>
      );
    default:
      return <input name={fd.name} defaultValue={(v as string) ?? ""} className="input" required={fd.required} />;
  }
}

function Fields({ fields, row, opts, compact }: { fields: Field[]; row?: Row; opts: Opts; compact?: boolean }) {
  return (
    <div className={compact ? "flex flex-1 flex-wrap items-end gap-3" : "grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"}>
      {fields.map((fd) =>
        fd.type === "bool" ? (
          <label key={fd.name} className={`flex items-center gap-2 text-sm ${fd.wide ? "sm:col-span-2 lg:col-span-4" : ""}`}>
            <Input fd={fd} row={row} opts={opts} />
            {fd.label}
          </label>
        ) : (
          <L key={fd.name} label={fd.label + (fd.help ? ` – ${fd.help}` : "")} className={compact ? (fd.name === "name" ? "min-w-48 flex-1" : "") : fd.wide || fd.type === "textarea" ? "sm:col-span-2" : ""}>
            <Input fd={fd} row={row} opts={opts} />
          </L>
        ),
      )}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }) {
  return { title: entityByKey((await params).key)?.title ?? "Stammdaten" };
}

export default async function EntityPage({ params }: { params: Promise<{ key: string }> }) {
  const ent = entityByKey((await params).key);
  if (!ent) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: Row[] = await (prisma as any)[ent.model].findMany({ orderBy: ent.orderBy });
  const [packages, addons, series] = await Promise.all([
    prisma.package.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.addon.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.series.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);
  const opts: Opts = {
    package: packages.map((p) => [p.id, p.name]),
    addon: addons.map((a) => [a.id, a.name]),
    series: series.map((s) => [s.code, s.name]),
  };
  const hidden = <input type="hidden" name="_entity" value={ent.key} />;
  return (
    <Page title={ent.title} intro={ent.intro}>
      {rows.length === 0 && <p className="text-sm text-neutral-500">Noch keine Einträge.</p>}
      {rows.map((r) => {
        const muted = ent.hasActive && r.active === false;
        const body = (
          <div className="flex flex-wrap items-end gap-3">
            <form action={saveEntity} className="flex flex-1 flex-wrap items-end gap-3">
              {hidden}
              <input type="hidden" name="id" value={r.id} />
              <Fields fields={ent.fields} row={r} opts={opts} compact={ent.compact} />
              {ent.hasActive && (
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input type="checkbox" name="active" defaultChecked={r.active !== false} className="size-4 accent-amber-500" />
                  aktiv
                </label>
              )}
              <SaveButton />
            </form>
            <form action={deleteEntity}>
              {hidden}
              <input type="hidden" name="id" value={r.id} />
              <button className="btn-ghost !border-red-900 text-red-400 hover:!border-red-600">Löschen</button>
            </form>
          </div>
        );
        return (
          <Card key={r.id} muted={muted}>
            {ent.compact ? body : (
              <details>
                <summary className="cursor-pointer font-semibold">{String(r[ent.titleField])}{muted ? " (inaktiv)" : ""}</summary>
                <div className="mt-3">{body}</div>
              </details>
            )}
          </Card>
        );
      })}
      <Card>
        <NewTitle>{ent.singular} anlegen</NewTitle>
        <form action={saveEntity} className="flex flex-wrap items-end gap-3">
          {hidden}
          <Fields fields={ent.fields} opts={opts} compact={ent.compact} />
          <SaveButton label="Hinzufügen" />
        </form>
      </Card>
    </Page>
  );
}
