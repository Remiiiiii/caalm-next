import { Query } from "node-appwrite";
import { getCalendarEventsByMonth } from "@/lib/actions/calendar.actions";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import type { ToolContext } from "@/lib/assistant/tools/types";
import CacheManager from "@/lib/services/cache-manager";

export function hasAll(
	ctx: ToolContext,
	keys: Parameters<typeof ctx.permissions.includes>[0][],
): boolean {
	return keys.every((k) => ctx.permissions.includes(k));
}

export async function invalidateCalendarForDate(
	dateStr: string,
	userId?: string,
): Promise<void> {
	const part = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
	const [year, month] = part.split("-").map(Number);
	if (!year || !month) {
		await CacheManager.invalidateCalendar(undefined, undefined, userId).catch(
			() => undefined,
		);
		return;
	}
	await CacheManager.invalidateCalendar(year, month, userId).catch(
		() => undefined,
	);
}

export const pad = (n: number) => String(n).padStart(2, "0");

/** "2026-08-05", "14:30" -> Date in server-local time (calendar stores local date + HH:mm). */
export function dateFromDateAndTime(
	dateStr: string,
	timeStr: string,
): Date | null {
	const datePart = dateStr.includes("T") ? dateStr.split("T")[0] : dateStr;
	const [y, m, d] = datePart.split("-").map(Number);
	const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
	if (!timeMatch || !y || !m || !d) return null;
	let hours = Number(timeMatch[1]);
	const minutes = Number(timeMatch[2]);
	const period = timeMatch[3]?.toUpperCase();
	if (period === "PM" && hours !== 12) hours += 12;
	if (period === "AM" && hours === 12) hours = 0;
	const dt = new Date(y, m - 1, d, hours, minutes, 0);
	return Number.isNaN(dt.getTime()) ? null : dt;
}

export function formatLocalDate(d: Date): string {
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Find a user's upcoming event by title keyword. Returns matches for caller to disambiguate. */
export async function findUpcomingEventsByTitle(
	ctx: ToolContext,
	search: string,
) {
	const now = new Date();
	const events = await getCalendarEventsByMonth(
		now.getFullYear(),
		now.getMonth() + 1,
		ctx.user.$id,
	);
	const q = search.trim().toLowerCase();
	const todayKey = formatLocalDate(now);
	return events
		.filter((e) => (e.startDate ?? "") >= todayKey)
		.filter((e) => (e.title ?? "").toLowerCase().includes(q))
		.slice(0, 5);
}

export function summarizeTask(task: {
	$id: string;
	title: string;
	status: string;
	priority?: string;
	dueDate?: string | null;
	assigneeId?: string | null;
}) {
	return {
		id: task.$id,
		title: task.title,
		status: task.status,
		priority: task.priority,
		dueDate: task.dueDate ?? null,
		assigneeId: task.assigneeId ?? null,
	};
}

export async function searchContractsTable(ctx: ToolContext, search: string) {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.contractsCollectionId || "contracts";
	const q = search.trim();
	const queries = [
		Query.equal("orgId", ctx.orgId),
		...(q ? [Query.contains("contractName", q)] : []),
		Query.orderDesc("$createdAt"),
		Query.limit(8),
	];
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries,
	});
	return result.rows.map((r: Record<string, unknown>) => ({
		id: r.$id,
		name: r.contractName ?? r.name,
		status: r.status,
		expiryDate: r.contractExpiryDate,
	}));
}

export async function searchLicensesTable(ctx: ToolContext, search: string) {
	const { tablesDB } = await createAdminClient();
	const tableId = appwriteConfig.licensesCollectionId || "licenses";
	const q = search.trim();
	const queries = [
		Query.equal("orgId", ctx.orgId),
		...(q ? [Query.contains("licenseName", q)] : []),
		Query.orderDesc("$createdAt"),
		Query.limit(8),
	];
	const result = await tablesDB.listRows({
		databaseId: appwriteConfig.databaseId!,
		tableId,
		queries,
	});
	return result.rows.map((r: Record<string, unknown>) => ({
		id: r.$id,
		name: r.licenseName ?? r.name,
		status: r.status,
		expirationDate: r.licenseExpiryDate,
	}));
}
