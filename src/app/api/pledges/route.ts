import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { requireGiftOrgContext } from "@/lib/gifts";
import { createPledgeWithInstallments } from "@/lib/pledges";

export async function POST(request: NextRequest) {
	const ctx = await requireGiftOrgContext(request, PERMISSIONS.GIFTS.CREATE);
	if (!ctx.ok) return ctx.response;

	try {
		const body = (await request.json()) as Record<string, unknown>;
		const totalAmount = Number(body.totalAmount);
		const constituentId = String(body.constituentId || "").trim();
		const rawInstallments = body.installments;
		if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
			return NextResponse.json(
				{ error: "totalAmount must be positive" },
				{ status: 400 },
			);
		}
		if (!constituentId) {
			return NextResponse.json(
				{ error: "constituentId is required" },
				{ status: 400 },
			);
		}
		if (!Array.isArray(rawInstallments) || rawInstallments.length === 0) {
			return NextResponse.json(
				{ error: "installments array is required" },
				{ status: 400 },
			);
		}
		const installments = rawInstallments.map((row) => {
			const item = row as Record<string, unknown>;
			return {
				dueDate: String(item.dueDate || ""),
				amount: Number(item.amount),
			};
		});
		if (installments.some((i) => !i.dueDate || !Number.isFinite(i.amount))) {
			return NextResponse.json({ error: "Invalid installment row" }, { status: 400 });
		}

		const result = await createPledgeWithInstallments({
			orgId: ctx.orgId,
			constituentId,
			totalAmount,
			currency: String(body.currency || "USD"),
			installments,
		});
		return NextResponse.json(result, { status: 201 });
	} catch (error) {
		console.error("[SERVER] pledges POST:", error);
		return NextResponse.json({ error: "Failed to create pledge" }, { status: 500 });
	}
}
