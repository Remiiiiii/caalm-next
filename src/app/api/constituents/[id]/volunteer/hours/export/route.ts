import { renderToStream } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import { Document, Page, Text, View } from "@react-pdf/renderer";
import React from "react";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById } from "@/lib/constituents";
import {
	listApprovedHoursForVolunteer,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

type RouteContext = { params: Promise<{ id: string }> };

function csvEscape(value: string): string {
	if (value.includes(",") || value.includes('"') || value.includes("\n")) {
		return `"${value.replace(/"/g, '""')}"`;
	}
	return value;
}

export async function GET(request: NextRequest, context: RouteContext) {
	const ctx = await requireVolunteerOrgContext(
		request,
		PERMISSIONS.VOLUNTEERS.VIEW,
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

	const from = request.nextUrl.searchParams.get("from")?.trim() || undefined;
	const to = request.nextUrl.searchParams.get("to")?.trim() || undefined;
	const format =
		request.nextUrl.searchParams.get("format")?.trim().toLowerCase() || "csv";

	const hours = await listApprovedHoursForVolunteer(ctx.orgId, id, from, to);
	const volunteerName =
		`${constituent.firstName} ${constituent.lastName}`.trim();

	if (format === "pdf") {
		const lines = hours.map(
			(h) =>
				`${h.workedAt.slice(0, 10)} · ${h.roleLabel || "Shift"} · ${(h.minutesWorked / 60).toFixed(2)} h`,
		);
		const doc = React.createElement(
			Document,
			null,
			React.createElement(
				Page,
				{ size: "LETTER", style: { padding: 40, fontSize: 11 } },
				React.createElement(
					View,
					null,
					React.createElement(Text, null, "Volunteer service letter"),
					React.createElement(Text, null, volunteerName),
					React.createElement(Text, null, "Approved hours only"),
					...lines.map((line) => React.createElement(Text, { key: line }, line)),
				),
			),
		);
		const pdfStream = await renderToStream(doc as never);
		const chunks: Buffer[] = [];
		for await (const chunk of pdfStream) {
			chunks.push(Buffer.from(chunk));
		}
		const body = Buffer.concat(chunks);
		return new NextResponse(body, {
			headers: {
				"Content-Type": "application/pdf",
				"Content-Disposition": `attachment; filename="volunteer-hours-${id}.pdf"`,
			},
		});
	}

	const header = "workedAt,roleLabel,minutesWorked,hours,grantContractId";
	const rows = hours.map((h) =>
		[
			csvEscape(h.workedAt),
			csvEscape(h.roleLabel || ""),
			String(h.minutesWorked),
			String((h.minutesWorked / 60).toFixed(2)),
			csvEscape(h.grantContractId || ""),
		].join(","),
	);
	const csv = [header, ...rows].join("\n");
	return new NextResponse(csv, {
		headers: {
			"Content-Type": "text/csv; charset=utf-8",
			"Content-Disposition": `attachment; filename="volunteer-hours-${id}.csv"`,
		},
	});
}
