import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { Box, H } from "../ui";

export const dynamic = "force-dynamic";
export const metadata = { title: "Team" };

export default async function TeamPage() {
  await requireUser();
  const users = await prisma.user.findMany({ where: { active: true }, orderBy: { name: "asc" } });
  return (
    <div>
      <H>Steckbriefe</H>
      {users.map((u) => (
        <Box key={u.id}>
          <div className="flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-amber-500 text-lg font-bold text-black">
              {u.name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase()}
            </div>
            <div>
              <div className="font-semibold">{u.name}</div>
              {u.position && <div className="text-sm text-neutral-400">{u.position}</div>}
            </div>
          </div>
          {u.skills && <p className="mt-3 text-sm"><span className="text-neutral-500">Kann: </span>{u.skills}</p>}
          {u.bio && <p className="mt-1 text-sm text-neutral-300">{u.bio}</p>}
          <div className="mt-3 flex gap-2 text-sm">
            {u.phone && <a href={`tel:${u.phone}`} className="btn-ghost">Anrufen</a>}
            {u.email && <a href={`mailto:${u.email}`} className="btn-ghost">E-Mail</a>}
          </div>
        </Box>
      ))}
    </div>
  );
}
