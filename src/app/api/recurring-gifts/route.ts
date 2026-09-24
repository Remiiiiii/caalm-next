import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { isGiftMethod, requireGiftOrgContext } from "@/lib/gifts";
import {
	createRecurringSchedule,
	RECURRING_FREQUENCIES,
	type RecurringFrequency,
} from "@/lib/recurring";

function isFrequency(value: unknown): value is RecurringFrequency {
	return (
		typeof value === "string" &&
		(RECURRING_FREQUENCIES as readonly string[]).includes(value)
	);
}

export async function POST(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const amount = Number(body.amount);
		const constituentId = String(body.constituentId || "").trim();
		const nextDueDate = String(body.nextDueDate || "").trim();
		const method = body.method;
		const frequency = body.frequency;
		if (!Number.isFinite(amount) || amount <= 0) {
			return NextResponse.json({ error: "Amount must be positive" }, { status: 400 });
		}
		if (!constituentId || !nextDueDate) {
			return NextResponse.json(
				{ error: "constituentId and nextDueDate are required" },
				{ status: 400 },
			);
		}
		if (!isGiftMethod(method)) {
			return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
		}
		if (!isFrequency(frequency)) {
			return NextResponse.json({ error: "Invalid frequency" }, { status: 400 });
		}

		const schedule = await createRecurringSchedule({
			orgId: ctx.orgId,
			constituentId,
			amount,
			currency: String(body.currency || "USD"),
			method,
			frequency,
			nextDueDate,
			campaignId: body.campaignId ? String(body.campaignId) : undefined,
			designationId: body.designationId ? String(body.designationId) : undefined,
		});
		return NextResponse.json(schedule, { status: 201 });
	} catch (error) {
		console.error("[SERVER] recurring-gifts POST:", error);
		return NextResponse.json(
			{ error: "Failed to create recurring schedule" },
			{ status: 500 },
		);
	}
}
