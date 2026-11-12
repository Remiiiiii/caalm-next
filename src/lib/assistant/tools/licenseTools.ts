import { PERMISSIONS } from "@/constants/permissions";
import { extractLicenseFromDocument } from "@/lib/ai/extractLicenseFromDocument";
import {
	licenseCreateSchema,
	licenseRenewalSchema,
} from "@/lib/api/licenses/schemas/license.schema";
import { LicenseService } from "@/lib/api/licenses/services/LicenseService";
import {
	decideLicense,
	getLicenseWorkflowForViewer,
} from "@/lib/approvals/LicenseApprovalWorkflowService";
import { hasAll, searchLicensesTable } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { consumeAiExtractionForOrg } from "@/lib/billing/consumeAiExtractionForRequest";
import { isPlanLimitError } from "@/lib/billing/planLimits";
import { logAuditEvent } from "@/lib/services/audit-logger";
import CacheManager from "@/lib/services/cache-manager";
import { constructFileUrl } from "@/lib/utils";

function actorName(ctx: ToolContext): string {
	return (
		(ctx.user as { fullName?: string }).fullName ||
		ctx.user.name ||
		ctx.user.email ||
		"User"
	);
}

function asError(message: string) {
	return { result: { error: message } };
}

type LicenseRecord = Record<string, unknown> & {
	$id?: string;
	licenseName?: string;
	fileId?: string;
};

function licenseLabel(license: LicenseRecord, fallback: string): string {
	return String(license.licenseName || license.name || fallback);
}

function licenseIdOf(license: LicenseRecord, fallback = ""): string {
	return String(license.$id || license.licenseId || fallback);
}

/** Resolve exactly one org-scoped license by id or fuzzy name search. */
async function resolveOneLicense(
	ctx: ToolContext,
	args: { licenseId?: unknown; query?: unknown },
): Promise<{ license?: LicenseRecord; error?: string }> {
	const licenseId = String(args.licenseId ?? "").trim();
	if (licenseId) {
		const license = await LicenseService.getLicenseByIdForOrg(
			licenseId,
			ctx.orgId,
		);
		// getLicenseByIdForOrg allows rows with no orgId; require an exact match.
		if (!license || String(license.orgId || "") !== ctx.orgId) {
			return { error: `No license found with id "${licenseId}".` };
		}
		return { license };
	}

	const query = String(args.query ?? "").trim();
	if (!query) return { error: "Which license? Give a name or id." };

	const matches = await searchLicensesTable(ctx, query);
	if (matches.length === 0) return { error: `No licenses match "${query}".` };
	if (matches.length > 1) {
		return {
			error: `Several licenses match "${query}": ${matches
				.slice(0, 3)
				.map((m) => m.name)
				.join(", ")}. Be more specific or use the license id.`,
		};
	}
	const license = await LicenseService.getLicenseByIdForOrg(
		String(matches[0].id),
		ctx.orgId,
	);
	if (!license || String(license.orgId || "") !== ctx.orgId) {
		return { error: `No license found with id "${matches[0].id}".` };
	}
	return { license };
}

async function auditLicense(
	ctx: ToolContext,
	opts: {
		action: "create" | "update";
		eventKey: string;
		title: string;
		summary: string;
		targetId: string;
		targetLabel: string;
		metadata?: Record<string, unknown>;
	},
) {
	await logAuditEvent({
		event_id: `assistant_license_${opts.eventKey}_${opts.targetId}_${Date.now()}`,
		event_title: opts.title,
		action: opts.action,
		source: "caalm",
		user_id: ctx.user.$id,
		user_name: actorName(ctx),
		user_email: ctx.user.email || "",
		status: "success",
		orgId: ctx.orgId,
		module: "licenses",
		target_type: "license",
		target_id: opts.targetId,
		target_label: opts.targetLabel,
		summary: opts.summary,
		metadata: { source: "ai_assistant", ...opts.metadata },
	}).catch(() => undefined);
}

const LICENSE_FIELD_PROPS = {
	licenseName: { type: "string" },
	licenseNumber: { type: "string" },
	licenseType: { type: "string" },
	issuingAuthority: { type: "string" },
	issueDate: { type: "string", description: "YYYY-MM-DD" },
	licenseExpiryDate: { type: "string", description: "YYYY-MM-DD" },
	division: { type: "string" },
	department: { type: "string" },
	vendor: { type: "string" },
	product: { type: "string" },
	cost: { type: "string" },
	currencyCode: { type: "string" },
	description: { type: "string" },
	notes: { type: "string" },
} as const;

export const LICENSE_TOOLS: ToolDefinition[] = [
	{
		name: "get_license",
		description:
			"Return one license's full record (dates, issuer, status, owner). Requires licenses.view.",
		requiredPermissions: [PERMISSIONS.LICENSES.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				licenseId: { type: "string", description: "License document id" },
				query: { type: "string", description: "License name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.VIEW])) {
				return asError(
					"You cannot view licenses. Ask an admin for the licenses.view permission.",
				);
			}
			try {
				const found = await resolveOneLicense(ctx, args);
				if (found.error || !found.license) {
					return asError(found.error ?? "License not found.");
				}
				return { result: { license: found.license } };
			} catch (error) {
				return asError(
					error instanceof Error ? error.message : "Failed to load license.",
				);
			}
		},
	},
	{
		name: "create_license",
		description:
			"Create a license record, or update one when licenseId/query is given. Requires licenses.create (updating also needs licenses.edit). Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.LICENSES.CREATE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				licenseId: {
					type: "string",
					description: "Existing license id to update (omit to create)",
				},
				query: {
					type: "string",
					description:
						"Existing license name search to update (omit to create)",
				},
				...LICENSE_FIELD_PROPS,
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.CREATE])) {
				return asError(
					"You cannot create licenses. Ask an admin for the licenses.create permission.",
				);
			}
			const { licenseId, query, ...fields } = args;
			const isUpdate = Boolean(
				String(licenseId ?? "").trim() || String(query ?? "").trim(),
			);

			try {
				if (isUpdate) {
					if (!hasAll(ctx, [PERMISSIONS.LICENSES.EDIT])) {
						return asError(
							"You cannot edit licenses. Ask an admin for the licenses.edit permission.",
						);
					}
					const parsed = licenseCreateSchema.partial().safeParse(fields);
					if (!parsed.success) {
						return asError(
							`Invalid license fields: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
						);
					}
					const found = await resolveOneLicense(ctx, { licenseId, query });
					if (found.error || !found.license) {
						return asError(found.error ?? "License not found.");
					}
					const id = licenseIdOf(found.license, String(licenseId));
					const updated = await LicenseService.updateLicense(id, parsed.data);
					await CacheManager.invalidateLicenses(ctx.orgId, id).catch(
						() => undefined,
					);
					const label = licenseLabel(updated ?? found.license, id);
					await auditLicense(ctx, {
						action: "update",
						eventKey: "update",
						title: `Assistant updated license: ${label}`,
						summary: `${actorName(ctx)} updated license "${label}"`,
						targetId: id,
						targetLabel: label,
						metadata: { updatedFields: Object.keys(parsed.data) },
					});
					return {
						result: {
							licenseId: id,
							licenseName: label,
							updated: true,
							updatedFields: Object.keys(parsed.data),
						},
					};
				}

				const parsed = licenseCreateSchema.safeParse(fields);
				if (!parsed.success) {
					return asError(
						`Invalid license fields: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
					);
				}
				const created = await LicenseService.createLicense(
					ctx.user.$id,
					parsed.data,
				);
				await CacheManager.invalidateLicenses(ctx.orgId).catch(() => undefined);
				const id = licenseIdOf(created);
				const label = licenseLabel(created ?? {}, parsed.data.licenseName);
				await auditLicense(ctx, {
					action: "create",
					eventKey: "create",
					title: `Assistant created license: ${label}`,
					summary: `${actorName(ctx)} created license "${label}"`,
					targetId: id,
					targetLabel: label,
				});
				return { result: { licenseId: id, licenseName: label, created: true } };
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to save the license.",
				);
			}
		},
	},
	{
		name: "renew_license",
		description:
			"Start a license renewal with a renewal date (optionally extending expiration). Requires licenses.edit. Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.LICENSES.EDIT],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				licenseId: { type: "string", description: "License document id" },
				query: { type: "string", description: "License name search" },
				renewalDate: { type: "string", description: "YYYY-MM-DD" },
				cost: { type: "string" },
				currencyCode: { type: "string" },
				notes: { type: "string" },
				extendExpiration: { type: "boolean" },
			},
			required: ["renewalDate"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.EDIT])) {
				return asError(
					"You cannot edit licenses. Ask an admin for the licenses.edit permission.",
				);
			}
			const renewalDate = String(args.renewalDate ?? "").trim();
			if (!renewalDate || Number.isNaN(new Date(renewalDate).getTime())) {
				return asError("Give a valid renewal date (YYYY-MM-DD).");
			}
			const parsed = licenseRenewalSchema.safeParse({
				renewalDate,
				cost: args.cost,
				currencyCode: args.currencyCode,
				notes: args.notes,
				extendExpiration: args.extendExpiration,
			});
			if (!parsed.success) {
				return asError(
					`Invalid renewal details: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
				);
			}
			try {
				const found = await resolveOneLicense(ctx, args);
				if (found.error || !found.license) {
					return asError(found.error ?? "License not found.");
				}
				const id = licenseIdOf(found.license, String(args.licenseId ?? ""));
				const data = parsed.data;
				const renewed = await LicenseService.renewLicense(id, {
					renewalDate: data.renewalDate,
					currencyCode: data.currencyCode,
					notes: data.notes,
					extendExpiration: data.extendExpiration,
					cost: data.cost !== undefined ? Number(data.cost) : undefined,
					renewedBy: ctx.user.$id,
				});
				await CacheManager.invalidateLicenses(ctx.orgId, id).catch(
					() => undefined,
				);
				const label = licenseLabel(renewed ?? found.license, id);
				await auditLicense(ctx, {
					action: "update",
					eventKey: "renew",
					title: `Assistant renewed license: ${label}`,
					summary: `${actorName(ctx)} renewed license "${label}"`,
					targetId: id,
					targetLabel: label,
					metadata: { renewalDate: data.renewalDate },
				});
				return { result: { licenseId: id, renewalDate, renewed: true } };
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to renew this license.",
				);
			}
		},
	},
	{
		name: "approve_license",
		description:
			"Approve, reject, or request changes on a license at its current approval step. Requires licenses.approve. Confirms decision; audits; checks real step assignment, not role name.",
		requiredPermissions: [PERMISSIONS.LICENSES.APPROVE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				licenseId: { type: "string", description: "License document id" },
				query: { type: "string", description: "License name search" },
				decision: {
					type: "string",
					enum: ["approved", "changes_requested", "rejected"],
				},
				notes: {
					type: "string",
					description: "Required for rejected or changes_requested",
				},
			},
			required: ["decision"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.APPROVE])) {
				return asError(
					"You cannot approve licenses. Ask an admin for the licenses.approve permission.",
				);
			}
			const decision = String(args.decision ?? "") as
				| "approved"
				| "changes_requested"
				| "rejected";
			if (!["approved", "changes_requested", "rejected"].includes(decision)) {
				return asError(
					"decision must be one of: approved, changes_requested, rejected.",
				);
			}
			const notes = args.notes ? String(args.notes).trim() : undefined;
			if (decision !== "approved" && !notes) {
				return asError("Notes are required to reject or request changes.");
			}
			const viewerUserId =
				(ctx.user as { accountId?: string }).accountId || ctx.user.$id;

			try {
				const found = await resolveOneLicense(ctx, args);
				if (found.error || !found.license) {
					return asError(found.error ?? "License not found.");
				}
				const id = licenseIdOf(found.license, String(args.licenseId ?? ""));
				const label = licenseLabel(found.license, id);

				// Real assignment state only: no admin override from the assistant.
				const before = await getLicenseWorkflowForViewer(id, viewerUserId, {
					isAdminOverride: false,
				});
				if (!before.canDecideAsAssignee) {
					return asError(
						"You are not the assignee for the current approval step on this license.",
					);
				}
				if (decision === "rejected" && !before.canReject) {
					return asError("Rejecting is not allowed at this approval step.");
				}

				const outcome = await decideLicense({
					licenseId: id,
					viewerUserId,
					decision,
					notes,
				});
				await CacheManager.invalidateLicenses(ctx.orgId, id).catch(
					() => undefined,
				);

				await auditLicense(ctx, {
					action: "update",
					eventKey: "approval",
					title: `Assistant recorded approval decision: ${label}`,
					summary: `${actorName(ctx)} recorded "${decision}" on license "${label}"`,
					targetId: id,
					targetLabel: label,
					metadata: { decision, notes },
				});
				return {
					result: {
						licenseId: id,
						decision,
						licenseStatus: outcome.contractStatus,
					},
				};
			} catch (error) {
				return asError(
					error instanceof Error
						? error.message
						: "Failed to record the approval decision.",
				);
			}
		},
	},
	{
		name: "extract_license_from_document",
		description:
			"AI-extract license fields from a license's attached document into fields for human review. Requires licenses.edit. Never auto-saves — review then use create_license to apply any you confirm.",
		requiredPermissions: [PERMISSIONS.LICENSES.EDIT],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				licenseId: { type: "string", description: "License document id" },
				query: { type: "string", description: "License name search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.LICENSES.EDIT])) {
				return asError(
					"You cannot edit licenses. Ask an admin for the licenses.edit permission.",
				);
			}
			try {
				const found = await resolveOneLicense(ctx, args);
				if (found.error || !found.license) {
					return asError(found.error ?? "License not found.");
				}
				const license = found.license;
				const id = licenseIdOf(license, String(args.licenseId ?? ""));
				const label = licenseLabel(license, id);
				const fileId = String(license.fileId || "");
				if (!fileId) {
					return asError(
						`"${label}" has no readable document attached yet. Enter the fields manually instead.`,
					);
				}
				const response = await fetch(constructFileUrl(fileId));
				if (!response.ok) {
					return asError(
						"Could not load the license document. Enter the fields manually instead.",
					);
				}
				// Count against the monthly AI quota, same as the extract-data route.
				await consumeAiExtractionForOrg(ctx.orgId);
				const buffer = Buffer.from(await response.arrayBuffer());
				const extraction = await extractLicenseFromDocument({
					buffer,
					fileName: `${label}.pdf`,
					fileType: response.headers.get("content-type") || undefined,
				});
				return {
					result: {
						licenseId: id,
						extractedData: extraction.extractedData,
						message:
							"Review these fields — nothing was saved. Use create_license (with this license's id) to apply any you confirm.",
					},
				};
			} catch (error) {
				if (isPlanLimitError(error)) return asError(error.message);
				return asError(
					error instanceof Error
						? error.message
						: "Failed to extract fields from the license document.",
				);
			}
		},
	},
];
