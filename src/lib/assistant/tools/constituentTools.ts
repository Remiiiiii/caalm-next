import { PERMISSIONS } from "@/constants/permissions";
import { hasAll } from "@/lib/assistant/tools/toolUtils";
import type { ToolContext, ToolDefinition } from "@/lib/assistant/tools/types";
import { createConstituentWithDuplicateGate } from "@/lib/constituents/create-constituent.service";
import { createRelationship } from "@/lib/constituents/relationships";
import {
	getConstituentById,
	listConstituents,
} from "@/lib/constituents/repository";
import type {
	ConstituentType,
	RelationshipType,
} from "@/lib/constituents/types";
import {
	CONSTITUENT_TYPES,
	RELATIONSHIP_TYPES,
} from "@/lib/constituents/types";
import { computeSuggestedAsk } from "@/lib/fundraising/ask";
import { getSegmentForConstituent } from "@/lib/fundraising/segments-repository";
import { getLatestWealthScreen } from "@/lib/fundraising/wealth-repository";
import {
	createDraftGift,
	GiftDomainError,
	listGifts,
	postGift,
} from "@/lib/gifts/repository";
import type { GiftMethod, GiftStatus } from "@/lib/gifts/types";
import { GIFT_METHODS } from "@/lib/gifts/types";
import { donationPageConfigActorFromUser } from "@/lib/give/donation-page-config/actor";
import { DonationPageConfigError } from "@/lib/give/donation-page-config/errors";
import { getDonationPageConfigService } from "@/lib/give/donation-page-config/runtime";
import { getOrganizationGiveSlug } from "@/lib/give/slug";
import { getOrganization } from "@/lib/rbac/organizations";
import { logAuditEvent } from "@/lib/services/audit-logger";
import { bookVolunteerOnShift } from "@/lib/volunteers/shift-bookings.repository";
import {
	getVolunteerShiftById,
	listVolunteerShiftsForOrg,
} from "@/lib/volunteers/volunteer-shifts.service";

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

async function auditNonprofit(
	ctx: ToolContext,
	opts: {
		action: "create" | "update";
		summary: string;
		targetType: string;
		targetId: string;
		targetLabel: string;
	},
) {
	await logAuditEvent({
		event_id: `assistant_nonprofit_${opts.targetType}_${opts.targetId}_${Date.now()}`,
		event_title: opts.summary,
		action: opts.action,
		source: "caalm",
		user_id: ctx.user.$id,
		user_name: actorName(ctx),
		user_email: ctx.user.email || "",
		orgId: ctx.orgId,
		status: "success",
		module: "governance",
		target_type: opts.targetType,
		target_id: opts.targetId,
		target_label: opts.targetLabel,
		summary: opts.summary,
	}).catch(() => undefined);
}

export const CONSTITUENT_TOOLS: ToolDefinition[] = [
	{
		name: "search_constituents",
		description:
			"Search/open a constituent record, or create a new one. Requires constituents.view to search; creating requires constituents.manage. Read is org-scoped; creating confirms and audits.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				constituentId: { type: "string" },
				query: { type: "string", description: "Name/email search" },
				type: {
					type: "string",
					enum: CONSTITUENT_TYPES as unknown as string[],
				},
				limit: { type: "number", description: "Max rows. Default 20." },
				create: { type: "boolean", description: "Create a new constituent" },
				firstName: { type: "string" },
				lastName: { type: "string" },
				email: { type: "string" },
				phone: { type: "string" },
				force: {
					type: "boolean",
					description: "Create despite duplicate matches",
				},
			},
		},
		handler: async (ctx, args) => {
			if (args.create) {
				if (!hasAll(ctx, [PERMISSIONS.CONSTITUENTS.MANAGE])) {
					return asError(
						"You cannot create constituents. Ask an admin for the constituents.manage permission.",
					);
				}
				const firstName = String(args.firstName ?? "").trim();
				const lastName = String(args.lastName ?? "").trim();
				if (!firstName || !lastName) {
					return asError("Give the constituent's first and last name.");
				}
				const type = CONSTITUENT_TYPES.includes(args.type as ConstituentType)
					? (args.type as ConstituentType)
					: "other";
				const result = await createConstituentWithDuplicateGate({
					payload: {
						orgId: ctx.orgId,
						type,
						firstName,
						lastName,
						email: args.email ? String(args.email) : undefined,
						phone: args.phone ? String(args.phone) : undefined,
					},
					force: Boolean(args.force),
					actor: {
						userId: ctx.user.$id,
						userName: actorName(ctx),
						userEmail: ctx.user.email || "",
					},
				});
				if (!result.ok) {
					return {
						result: {
							error:
								"Possible duplicate constituents found. Confirm with force to create anyway.",
							candidates: result.candidates,
						},
					};
				}
				if (!args.force) {
					await auditNonprofit(ctx, {
						action: "create",
						summary: `Created constituent ${firstName} ${lastName}`,
						targetType: "constituent",
						targetId: result.constituent.$id,
						targetLabel: `${firstName} ${lastName}`,
					});
				}
				return {
					result: { constituent: result.constituent, created: true },
				};
			}
			if (!hasAll(ctx, [PERMISSIONS.CONSTITUENTS.VIEW])) {
				return asError(
					"You cannot view constituents. Ask an admin for the constituents.view permission.",
				);
			}
			const constituentId = String(args.constituentId ?? "").trim();
			if (constituentId) {
				const constituent = await getConstituentById(constituentId);
				if (!constituent || constituent.orgId !== ctx.orgId) {
					return asError(`No constituent found with id "${constituentId}".`);
				}
				return { result: { constituent } };
			}
			const type = CONSTITUENT_TYPES.includes(args.type as ConstituentType)
				? (args.type as ConstituentType)
				: undefined;
			const { items, total } = await listConstituents({
				orgId: ctx.orgId,
				search: args.query ? String(args.query) : undefined,
				type,
				limit: Math.min(Number(args.limit) || 20, 100),
			});
			return { result: { constituents: items, count: items.length, total } };
		},
	},
	{
		name: "add_relationship",
		description:
			"Add a relationship between two constituents (household, spouse, employer, solicitor). Requires constituents.manage. Confirm before writing; audits.",
		requiredPermissions: [PERMISSIONS.CONSTITUENTS.MANAGE],
		mutating: true,
		parameters: {
			type: "object",
			properties: {
				fromId: { type: "string" },
				toId: { type: "string" },
				type: {
					type: "string",
					enum: RELATIONSHIP_TYPES as unknown as string[],
				},
				softCredit: { type: "boolean" },
			},
			required: ["fromId", "toId", "type"],
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONSTITUENTS.MANAGE])) {
				return asError(
					"You cannot add relationships. Ask an admin for the constituents.manage permission.",
				);
			}
			const fromId = String(args.fromId ?? "").trim();
			const toId = String(args.toId ?? "").trim();
			if (!fromId || !toId) {
				return asError("Give both constituent ids.");
			}
			if (!RELATIONSHIP_TYPES.includes(args.type as RelationshipType)) {
				return asError(
					"type must be household, spouse, employer, or solicitor.",
				);
			}
			const result = await createRelationship({
				orgId: ctx.orgId,
				fromId,
				toId,
				type: args.type as RelationshipType,
				softCredit: Boolean(args.softCredit),
			});
			if (!result.ok) {
				return asError(result.error);
			}
			await auditNonprofit(ctx, {
				action: "create",
				summary: `Added ${args.type} relationship between constituents`,
				targetType: "constituent_relationship",
				targetId: result.relationship.$id,
				targetLabel: `${fromId} -> ${toId}`,
			});
			return { result: { relationship: result.relationship, created: true } };
		},
	},
	{
		name: "log_gift",
		description:
			"Log a gift for a constituent, or list gifts. Listing requires gifts.view; logging requires gifts.create. Logging confirms and audits; org-scoped, no cross-org reads.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["list", "log"] },
				constituentId: { type: "string" },
				campaignId: { type: "string" },
				status: { type: "string", description: "draft, posted, voided" },
				limit: { type: "number", description: "Max rows. Default 20." },
				amount: { type: "number" },
				currency: { type: "string" },
				giftDate: { type: "string", description: "YYYY-MM-DD" },
				method: { type: "string", enum: GIFT_METHODS as unknown as string[] },
				designationId: { type: "string" },
				anonymous: { type: "boolean" },
			},
		},
		handler: async (ctx, args) => {
			if (args.action === "log") {
				if (!hasAll(ctx, [PERMISSIONS.GIFTS.CREATE])) {
					return asError(
						"You cannot log gifts. Ask an admin for the gifts.create permission.",
					);
				}
				const constituentId = String(args.constituentId ?? "").trim();
				const amount = Number(args.amount);
				const giftDate = String(args.giftDate ?? "").trim();
				if (!constituentId || !amount || amount <= 0 || !giftDate) {
					return asError(
						"Give the constituent id, a positive amount, and the gift date.",
					);
				}
				if (!GIFT_METHODS.includes(args.method as GiftMethod)) {
					return asError(
						"method must be check, card, cash, wire, ach, or other.",
					);
				}
				try {
					const draft = await createDraftGift({
						orgId: ctx.orgId,
						amount,
						currency: args.currency ? String(args.currency) : undefined,
						giftDate,
						method: args.method as GiftMethod,
						constituentId,
						campaignId: args.campaignId ? String(args.campaignId) : undefined,
						designationId: args.designationId
							? String(args.designationId)
							: undefined,
						anonymous: Boolean(args.anonymous),
					});
					const posted = await postGift(draft.$id, ctx.orgId);
					await auditNonprofit(ctx, {
						action: "create",
						summary: `Logged a ${posted.amount} ${posted.currency} gift`,
						targetType: "gift",
						targetId: posted.$id,
						targetLabel: `Gift ${posted.$id}`,
					});
					return {
						result: {
							giftId: posted.$id,
							amount: posted.amount,
							currency: posted.currency,
							status: posted.status,
							receiptNumber: posted.receiptNumber,
							logged: true,
						},
					};
				} catch (error) {
					if (error instanceof GiftDomainError) {
						return asError(error.message);
					}
					return asError(
						error instanceof Error ? error.message : "Could not log that gift.",
					);
				}
			}
			if (!hasAll(ctx, [PERMISSIONS.GIFTS.VIEW])) {
				return asError(
					"You cannot view gifts. Ask an admin for the gifts.view permission.",
				);
			}
			const { items } = await listGifts({
				orgId: ctx.orgId,
				status: args.status as GiftStatus | undefined,
				campaignId: args.campaignId ? String(args.campaignId) : undefined,
				limit: Math.min(Number(args.limit) || 20, 100),
			});
			const constituentId = args.constituentId
				? String(args.constituentId)
				: "";
			const gifts = constituentId
				? items.filter((g) => g.constituentId === constituentId)
				: items;
			return { result: { gifts, count: gifts.length } };
		},
	},
	{
		name: "share_donation_page",
		description:
			"Share the donation page's URL, update its suggested amounts/designations, or publish the draft. Sharing/viewing requires donations.config.view; updating/publishing requires donations.config.edit. Confirm writes; audits; org-scoped.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["share", "update", "publish"] },
				amounts: {
					type: "array",
					items: { type: "number" },
					description: "Suggested amounts in dollars, ascending",
				},
				designations: { type: "array", items: { type: "string" } },
				changeSummary: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			const service = getDonationPageConfigService();
			if (args.action === "update") {
				if (!hasAll(ctx, [PERMISSIONS.DONATIONS.CONFIG_EDIT])) {
					return asError(
						"You cannot edit the donation page. Ask an admin for the donations.config.edit permission.",
					);
				}
				const draft = await service.getOrCreateDraft(ctx.orgId);
				const payload = {
					...draft.payload,
					...(Array.isArray(args.amounts) && args.amounts.length > 0
						? {
								amountsCents: args.amounts.map((d: number) =>
									Math.round(Number(d) * 100),
								),
							}
						: {}),
					...(Array.isArray(args.designations) && args.designations.length > 0
						? { designations: args.designations.map((d: unknown) => String(d)) }
						: {}),
				};
				try {
					await service.updateDraft({
						orgId: ctx.orgId,
						payload,
						expectedVersion: draft.version,
					});
				} catch (error) {
					if (error instanceof DonationPageConfigError) {
						return asError(error.message);
					}
					return asError(
						error instanceof Error
							? error.message
							: "Could not update the donation page.",
					);
				}
				await auditNonprofit(ctx, {
					action: "update",
					summary: "Updated the donation page draft",
					targetType: "donation_page",
					targetId: ctx.orgId,
					targetLabel: "Donation page",
				});
				return { result: { updated: true } };
			}
			if (args.action === "publish") {
				if (!hasAll(ctx, [PERMISSIONS.DONATIONS.CONFIG_EDIT])) {
					return asError(
						"You cannot publish the donation page. Ask an admin for the donations.config.edit permission.",
					);
				}
				try {
					await service.publish({
						orgId: ctx.orgId,
						actor: donationPageConfigActorFromUser(ctx.user),
						changeSummary: args.changeSummary
							? String(args.changeSummary)
							: undefined,
					});
				} catch (error) {
					if (error instanceof DonationPageConfigError) {
						return asError(error.message);
					}
					return asError(
						error instanceof Error
							? error.message
							: "Could not publish the donation page.",
					);
				}
				await auditNonprofit(ctx, {
					action: "update",
					summary: "Published the donation page",
					targetType: "donation_page",
					targetId: ctx.orgId,
					targetLabel: "Donation page",
				});
				return { result: { published: true } };
			}
			if (!hasAll(ctx, [PERMISSIONS.DONATIONS.CONFIG_VIEW])) {
				return asError(
					"You cannot view the donation page. Ask an admin for the donations.config.view permission.",
				);
			}
			const org = await getOrganization(ctx.orgId);
			if (!org) {
				return asError("Organization not found.");
			}
			const giveSlug = getOrganizationGiveSlug(org);
			const origin =
				process.env.NEXT_PUBLIC_APP_URL ||
				process.env.NEXT_PUBLIC_SITE_URL ||
				"";
			const published = await service.getPublished(ctx.orgId);
			if (published) {
				const url = origin
					? `${origin.replace(/\/$/, "")}/give/${encodeURIComponent(giveSlug)}`
					: `/give/${encodeURIComponent(giveSlug)}`;
				return { result: { url, published: true, giveSlug } };
			}
			const token = service.createPreviewToken(ctx.orgId);
			const previewPath = `/give/${encodeURIComponent(giveSlug)}?donationPreview=${encodeURIComponent(token)}`;
			const previewUrl = origin
				? `${origin.replace(/\/$/, "")}${previewPath}`
				: previewPath;
			return {
				result: {
					previewUrl,
					published: false,
					giveSlug,
					note: "Nothing is published yet; this preview link is only for review.",
				},
			};
		},
	},
	{
		name: "assign_volunteer",
		description:
			"List volunteer shifts, or assign a constituent to one. Listing requires volunteers.view; assigning requires volunteers.manage. Assigning confirms and audits; org-scoped, no cross-org assignment.",
		requiredPermissions: [],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				action: { type: "string", enum: ["list", "assign"] },
				eventId: { type: "string" },
				constituentId: { type: "string" },
			},
		},
		handler: async (ctx, args) => {
			if (args.action === "assign") {
				if (!hasAll(ctx, [PERMISSIONS.VOLUNTEERS.MANAGE])) {
					return asError(
						"You cannot assign volunteers. Ask an admin for the volunteers.manage permission.",
					);
				}
				const eventId = String(args.eventId ?? "").trim();
				const constituentId = String(args.constituentId ?? "").trim();
				if (!eventId || !constituentId) {
					return asError("Give the shift id and the constituent id.");
				}
				const shift = await getVolunteerShiftById(ctx.orgId, eventId);
				if (!shift) {
					return asError(`No volunteer shift found with id "${eventId}".`);
				}
				const constituent = await getConstituentById(constituentId);
				if (!constituent || constituent.orgId !== ctx.orgId) {
					return asError(`No constituent found with id "${constituentId}".`);
				}
				const booking = await bookVolunteerOnShift({
					orgId: ctx.orgId,
					eventId,
					constituentId,
					shiftCapacity: shift.shiftCapacity,
				});
				await auditNonprofit(ctx, {
					action: "create",
					summary: `Assigned a volunteer to ${shift.title}`,
					targetType: "volunteer_booking",
					targetId: booking.$id,
					targetLabel: shift.title,
				});
				return {
					result: {
						bookingId: booking.$id,
						status: booking.status,
						assigned: true,
					},
				};
			}
			if (!hasAll(ctx, [PERMISSIONS.VOLUNTEERS.VIEW])) {
				return asError(
					"You cannot view volunteer shifts. Ask an admin for the volunteers.view permission.",
				);
			}
			const shifts = await listVolunteerShiftsForOrg(ctx.orgId);
			return { result: { shifts, count: shifts.length } };
		},
	},
	{
		name: "compute_suggested_ask",
		description:
			"Return the suggested ask amount for a constituent from the existing fundraising logic, with the basis for the number. Requires constituents.view. Read-only; org-scoped.",
		requiredPermissions: [PERMISSIONS.CONSTITUENTS.VIEW],
		mutating: false,
		parameters: {
			type: "object",
			properties: {
				constituentId: { type: "string" },
				query: { type: "string", description: "Name/email search" },
			},
		},
		handler: async (ctx, args) => {
			if (!hasAll(ctx, [PERMISSIONS.CONSTITUENTS.VIEW])) {
				return asError(
					"You cannot view constituents. Ask an admin for the constituents.view permission.",
				);
			}
			let constituentId = String(args.constituentId ?? "").trim();
			if (!constituentId) {
				const query = String(args.query ?? "").trim();
				if (!query) {
					return asError("Give a constituent id or a name/email to search.");
				}
				const { items } = await listConstituents({
					orgId: ctx.orgId,
					search: query,
					limit: 5,
				});
				if (items.length === 0) {
					return asError(`No constituent found matching "${query}".`);
				}
				if (items.length > 1) {
					return {
						result: {
							error:
								"Multiple constituents match; be more specific or give an id.",
							candidates: items.map((c) => ({
								$id: c.$id,
								firstName: c.firstName,
								lastName: c.lastName,
								email: c.email,
							})),
						},
					};
				}
				constituentId = items[0].$id;
			}
			const constituent = await getConstituentById(constituentId);
			if (!constituent || constituent.orgId !== ctx.orgId) {
				return asError(`No constituent found with id "${constituentId}".`);
			}
			if (constituent.doNotContact) {
				return asError(
					"Scores aren't computed for do-not-contact constituents.",
				);
			}
			const row = await getSegmentForConstituent(ctx.orgId, constituentId);
			if (!row) {
				return asError(
					"Scores haven't been computed yet for this constituent.",
				);
			}
			const { items: gifts } = await listGifts({
				orgId: ctx.orgId,
				limit: 200,
			});
			const giftRows = gifts
				.filter((g) => g.constituentId === constituentId)
				.map((g) => ({
					giftDate: g.giftDate,
					amount: g.amount,
					status: g.status,
					voidOfId: g.voidOfId,
				}));
			const wealth = await getLatestWealthScreen(ctx.orgId, constituentId);
			const ask = computeSuggestedAsk({
				gifts: giftRows,
				upgradeReadinessScore: row.upgradeReadinessScore ?? 0,
				capacityBand: wealth?.capacityBand ?? null,
			});
			return {
				result: {
					constituentId,
					suggestedAsk: ask.suggestedAsk,
					basis: {
						baseAmount: ask.baseAmount,
						upgradeReadinessScore: row.upgradeReadinessScore ?? null,
						upgradeFactor: ask.upgradeFactor,
						capacityBand: wealth?.capacityBand ?? null,
						cappedByCapacity: ask.cappedByCapacity,
					},
				},
			};
		},
	},
];
