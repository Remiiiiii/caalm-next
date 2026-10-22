import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/actions/user.actions";
import { reportLoadError } from "@/lib/incidents/incident.repository";
import { uploadIncidentScreenshot } from "@/lib/incidents/incident-screenshot";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

const reportSchema = z.object({
	scale: z.enum(["page", "section", "table", "banner"]),
	route: z.string().max(255),
	elementKey: z.string().max(100),
	errorStatus: z.number().int().optional(),
	errorCode: z.string().max(100).optional(),
	requestPath: z.string().max(255).optional(),
	traceId: z.string().max(100).optional(),
	userAgent: z.string().max(500).optional(),
	viewport: z.string().max(32).optional(),
	appVersion: z.string().max(32).optional(),
	/** Base64 data URL of the client-captured error region, if capture succeeded. */
	screenshotDataUrl: z.string().optional(),
});

/**
 * Any authenticated user may report a failure they just saw — this isn't
 * gated on an IT permission. Per spec 5.4, offline/401/403/aborted requests
 * never reach this route; <LoadError> only calls it for real failures.
 */
export async function POST(request: NextRequest) {
	const user = await getCurrentUser();
	if (!user) {
		return NextResponse.json(
			{ error: "Authentication required" },
			{ status: 401 },
		);
	}

	const defaultOrg = await getUserDefaultOrganization(user.$id);
	if (!defaultOrg?.orgId) {
		return NextResponse.json(
			{ error: "Organization not found" },
			{ status: 404 },
		);
	}

	const body = await request.json().catch(() => null);
	const parsed = reportSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
	}
	const { screenshotDataUrl, ...input } = parsed.data;

	const screenshotFileId = await uploadIncidentScreenshot(screenshotDataUrl);

	const incident = await reportLoadError({
		...input,
		screenshotFileId: screenshotFileId ?? undefined,
		organizationId: defaultOrg.orgId,
		userId: user.$id,
	});

	return NextResponse.json({
		success: true,
		data: { reference: incident.reference },
	});
}
