import { type NextRequest, NextResponse } from "next/server";
import { requireContractCreateContext } from "@/lib/templates/require-org-permission";
import {
	deleteWizardSession,
	getWizardSession,
	parseWizardPayload,
	saveWizardSession,
} from "@/lib/templates/wizard.service";

type RouteContext = { params: Promise<{ id: string }> };

async function loadOwnedSession(id: string, orgId: string, userId: string) {
	const session = await getWizardSession(id);
	if (!session || session.orgId !== orgId || session.userId !== userId) {
		return null;
	}
	return session;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const session = await loadOwnedSession(id, auth.orgId, auth.user.$id);
	if (!session) {
		return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
	}
	return NextResponse.json({ session });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const session = await loadOwnedSession(id, auth.orgId, auth.user.$id);
	if (!session) {
		return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
	}

	try {
		const body = await request.json();
		const payload = parseWizardPayload(body.payload ?? body);
		const updated = await saveWizardSession({
			session,
			orgId: auth.orgId,
			userId: auth.user.$id,
			payload,
			currentStep:
				typeof body.currentStep === "number" ? body.currentStep : undefined,
		});
		return NextResponse.json({ session: updated });
	} catch (error) {
		console.error("[contracts/wizard PATCH]", error);
		const message =
			error instanceof Error ? error.message : "Failed to save wizard";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}

export async function DELETE(request: NextRequest, context: RouteContext) {
	const auth = await requireContractCreateContext(request);
	if (!auth.ok) return auth.response;
	const { id } = await context.params;
	const session = await loadOwnedSession(id, auth.orgId, auth.user.$id);
	if (!session) {
		return NextResponse.json({ error: "Wizard not found" }, { status: 404 });
	}

	try {
		await deleteWizardSession({
			sessionId: id,
			orgId: auth.orgId,
			userId: auth.user.$id,
		});
		return NextResponse.json({ deleted: [id] });
	} catch (error) {
		console.error("[contracts/wizard DELETE id]", error);
		const message =
			error instanceof Error ? error.message : "Failed to delete draft";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
