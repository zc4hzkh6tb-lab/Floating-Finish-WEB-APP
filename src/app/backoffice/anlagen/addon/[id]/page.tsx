import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { Back, Page } from "../../../ui";
import { Components } from "../../Components";

export const dynamic = "force-dynamic";

export default async function AddonMaterialPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [addon, articles] = await Promise.all([
    prisma.addon.findUnique({ where: { id }, include: { category: true, articles: { include: { article: { include: { category: true } } } } } }),
    prisma.article.findMany({ where: { active: true }, orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }], include: { category: true } }),
  ]);
  if (!addon) notFound();
  return (
    <Page title={`Material: ${addon.name}`} intro={<Back href="/backoffice/anlagen" label="Anlagen" />}>
      <Components owner="addon" ownerId={addon.id} items={addon.articles} articles={articles} />
    </Page>
  );
}
