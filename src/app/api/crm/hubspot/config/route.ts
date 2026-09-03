import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCrmIntegration, updateCrmIntegration } from "@/lib/crm/integrations.repository";
import { resolveCrmOrgRequest } from "@/lib/crm/request-context";
import { DEFAULT_CRM_FIELD_MAP, parseCrmConfig } from "@/lib/crm/types";
import { requirePermission } from "@/lib/rbac/middleware";

export async function PUT(request: NextRequest) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.SETTINGS.INTEGRATIONS,
	});
	if (denied) return denied;

	const resolved = await resolveCrmOrgRequest(request, "hubspot");
	if ("response" in resolved) return resolved.response;

	try {
		const integration = await getCrmIntegration(resolved.orgId, "hubspot");
		if (!integration || integration.status !== "connected") {
			return NextResponse.json(
				{ error: "Connect HubSpot before saving a stage trigger." },
				{ status: 400 },
			);
		}

		const body = (await request.json()) as {
			pipelineId?: string;
			triggerStageId?: string;
			enabled?: boolean;
		};
		const current = parseCrmConfig(integration.config_json);
		const next = {
			pipelineId:
				typeof body.pipelineId === "string"
					? body.pipelineId
					: current.pipelineId,
			triggerStageId:
				typeof body.triggerStageId === "string"
					? body.triggerStageId
					: current.triggerStageId,
			fieldMap: current.fieldMap || DEFAULT_CRM_FIELD_MAP,
			enabled: body.enabled !== false,
		};

		await updateCrmIntegration(integration.$id, {
			config_json: JSON.stringify(next),
			last_error: "",
		});

		return NextResponse.json({ success: true, config: next });
	} catch (error) {
		console.error("[crm/hubspot/config]", error);
		return NextResponse.json(
			{ error: "Failed to save HubSpot config" },
			{ status: 500 },
		);
	}
}
