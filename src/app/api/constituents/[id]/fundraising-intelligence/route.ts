import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import {
	constituentActorFromUser,
	logConstituentAudit,
	requireConstituentOrgContext,
} from "@/lib/constituents";
import { getConstituentById } from "@/lib/constituents/repository";
import {
	getSegmentForConstituent,
	updateAskOverride,
} from "@/lib/fundraising/segments-repository";
import { getLatestWealthScreen } from "@/lib/fundraising/wealth-repository";

type RouteContext = { params: Promise<{ id: string }> };

function topFeaturesFromJson(json: string | undefined) {
	if (!json) return [];
	try {
		return JSON.parse(json) as Array<{
			label: string;
			weight: number;
			direction: string;
		}>;
	} catch {
		return [];
	}
}

function mergeTopFeatures(
	lapseJson: string,
	upgradeJson?: string,
	limit = 3,
) {
	const combined = [
		...topFeaturesFromJson(lapseJson),
		...topFeaturesFromJson(upgradeJson),
	];
	return [...combined].sort((a, b) => b.weight - a.weight).slice(0, limit);
}

function buildPayload(
	id: string,
	row: NonNullable<Awaited<ReturnType<typeof getSegmentForConstituent>>>,
	wealth: Awaited<ReturnType<typeof getLatestWealthScreen>>,
) {
	const lapseTop = topFeaturesFromJson(row.featureWeightsJson)
		.sort((a, b) => b.weight - a.weight)
		.slice(0, 3);
	const upgradeTop = topFeaturesFromJson(row.upgradeFeatureWeightsJson)
		.sort((a, b) => b.weight - a.weight)
		.slice(0, 3);
	const topFeatures = mergeTopFeatures(
		row.featureWeightsJson,
		row.upgradeFeatureWeightsJson,
	);
	const suggestedAsk =
		row.suggestedAskAmount != null ? row.suggestedAskAmount : null;
	const effectiveAsk =
		row.askOverrideAmount != null
			? row.askOverrideAmount
			: suggestedAsk;

	return {
		constituentId: id,
		segment: row.segment,
		computedAt: row.computedAt,
		lapseRiskScore: row.lapseRiskScore,
		upgradeReadinessScore: row.upgradeReadinessScore ?? null,
		suggestedAsk,
		effectiveAsk,
		askOverrideAmount: row.askOverrideAmount ?? null,
		askOverrideReason: row.askOverrideReason ?? null,
		capacityBand: wealth?.capacityBand ?? null,
		wealthSource: wealth?.source ?? null,
		wealthScreenDate: wealth?.screenDate ?? null,
		topFeatures,
		lapseTopFeatures: lapseTop,
		upgradeTopFeatures: upgradeTop,
		featureWeights: topFeaturesFromJson(row.featureWeightsJson),
	};
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.AI.FUNDRAISING,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}
	if (constituent.doNotContact) {
		return NextResponse.json(
			{ error: "Scores not computed for do-not-contact constituents" },
			{ status: 404 },
		);
	}

	try {
		const row = await getSegmentForConstituent(ctx.orgId, id);
		if (!row) {
			return NextResponse.json(
				{ error: "Scores not computed yet" },
				{ status: 404 },
			);
		}
		const wealth = await getLatestWealthScreen(ctx.orgId, id);
		return NextResponse.json(buildPayload(id, row, wealth));
	} catch (error) {
		console.error("[SERVER] fundraising-intelligence GET:", error);
		return NextResponse.json(
			{ error: "Failed to load fundraising intelligence" },
			{ status: 500 },
		);
	}
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const ctx = await requireConstituentOrgContext(
		request,
		PERMISSIONS.AI.FUNDRAISING,
	);
	if (!ctx.ok) return ctx.response;
	const { id } = await context.params;

	const constituent = await getConstituentById(id);
	if (!constituent || constituent.orgId !== ctx.orgId) {
		return NextResponse.json(
			{ error: "Constituent not found" },
			{ status: 404 },
		);
	}

	let body: { askOverrideAmount?: number; askOverrideReason?: string };
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const askOverrideAmount = Number(body.askOverrideAmount);
	const askOverrideReason = body.askOverrideReason?.trim() ?? "";
	if (!Number.isFinite(askOverrideAmount) || askOverrideAmount <= 0) {
		return NextResponse.json(
			{ error: "askOverrideAmount must be a positive number" },
			{ status: 400 },
		);
	}
	if (askOverrideReason.length < 3) {
		return NextResponse.json(
			{ error: "askOverrideReason is required" },
			{ status: 400 },
		);
	}

	const updated = await updateAskOverride({
		orgId: ctx.orgId,
		constituentId: id,
		askOverrideAmount,
		askOverrideReason,
	});
	if (!updated) {
		return NextResponse.json(
			{ error: "Scores not computed yet" },
			{ status: 404 },
		);
	}

	await logConstituentAudit({
		action: "update",
		actor: constituentActorFromUser(ctx.user),
		orgId: ctx.orgId,
		targetId: id,
		targetLabel: "Suggested ask override",
		summary: "Staff overrode suggested ask amount",
		metadata: {
			askOverrideAmount,
			askOverrideReason,
		},
	});

	const wealth = await getLatestWealthScreen(ctx.orgId, id);
	return NextResponse.json(buildPayload(id, updated, wealth));
}
