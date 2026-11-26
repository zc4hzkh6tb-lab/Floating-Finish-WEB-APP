import type { BookingStatus } from "@prisma/client";
import { STATUS_LABEL, STATUS_STYLE } from "@/lib/labels";

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`inline-block whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STATUS_STYLE[status]}`}>{STATUS_LABEL[status]}</span>;
}
