import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { loadContractForOrg } from "@/lib/contracts/negotiation/contract-scope";
import { getOrgIdFromRequest, requirePermission } from "@/lib/rbac/middleware";
import { mailgunService } from "@/lib/services/mailgun";

type RouteContext = { params: Promise<{ id: string }> };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NEGOTIATION_PATH_RE = /^\/negotiate\/[A-Za-z0-9_-]+$/;

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

export async function POST(request: NextRequest, context: RouteContext) {
	const denied = await requirePermission(request, {
		permission: PERMISSIONS.CONTRACTS.EDIT,
	});
	if (denied) return denied;

	const orgId = getOrgIdFromRequest(request);
	if (!orgId) {
		return NextResponse.json(
			{ error: "Organization is required" },
			{ status: 400 },
		);
	}

	const { id } = await context.params;
	const body = (await request.json().catch(() => ({}))) as Record<
		string,
		unknown
	>;
	const emails = Array.isArray(body.emails)
		? [
				...new Set(
					body.emails
						.map((email) => String(email).trim().toLowerCase())
						.filter((email) => EMAIL_RE.test(email)),
				),
			]
		: [];
	const message = String(body.message || "")
		.trim()
		.slice(0, 2000);
	const urlPath = String(body.urlPath || "");

	if (emails.length === 0 || !NEGOTIATION_PATH_RE.test(urlPath)) {
		return NextResponse.json(
			{ error: "Valid recipients and negotiation link are required" },
			{ status: 400 },
		);
	}

	try {
		const contract = await loadContractForOrg(id, orgId);
		const contractName = String(
			contract.contractName || contract.name || "Contract draft",
		);
		const baseUrl =
			process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
			request.nextUrl.origin;
		const link = `${baseUrl}${urlPath}`;
		const text = [
			`You have been invited to review "${contractName}" in CAALM.`,
			message ? `\n${message}` : "",
			`\nOpen the draft: ${link}`,
			"\nThis secure link expires in 14 days. You can view the draft and leave comments without a CAALM login.",
		].join("");
		const htmlMessage = message
			? `<p>${escapeHtml(message).replace(/\n/g, "<br />")}</p>`
			: "";
		const html = [
			`<p>You have been invited to review <strong>${escapeHtml(contractName)}</strong> in CAALM.</p>`,
			htmlMessage,
			`<p><a href="${escapeHtml(link)}">Open the draft</a></p>`,
			"<p>This secure link expires in 14 days. You can view the draft and leave comments without a CAALM login.</p>",
		].join("");

		await Promise.all(
			emails.map((email) =>
				mailgunService.sendEmail({
					to: email,
					subject: `[CAALM] Review requested: ${contractName}`,
					text,
					html,
				}),
			),
		);
		return NextResponse.json({ sent: emails.length });
	} catch (error) {
		const message =
			error instanceof Error ? error.message : "Failed to send invitations";
		return NextResponse.json({ error: message }, { status: 400 });
	}
}
