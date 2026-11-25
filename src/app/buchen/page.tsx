import { loadMasterData } from "@/lib/masterdata";
import BookingWizard from "./BookingWizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Stream buchen" };

export default async function BuchenPage() {
  const data = await loadMasterData();
  return <BookingWizard data={data} />;
}
