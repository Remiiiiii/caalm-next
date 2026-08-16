import type { IssueHistoryMonthGroup } from "@/lib/tickets/issue-history";
import { IssueHistoryView } from "./IssueHistoryView";

export function IssueHistoryList({
	months,
}: {
	months: IssueHistoryMonthGroup[];
}) {
	return <IssueHistoryView months={months} />;
}
