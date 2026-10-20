import { Document, renderToStream } from "@react-pdf/renderer";
import { type NextRequest, NextResponse } from "next/server";
import React from "react";
import { PERMISSIONS } from "@/constants/permissions";
import { getConstituentById } from "@/lib/constituents/server";
import { xlsxResponse } from "@/lib/export/xlsx-response";
import {
	Heading,
	PacketHeader,
	PacketPage,
	PacketTable,
	StatBand,
} from "@/lib/pdf/packet";
import {
	listApprovedHoursForVolunteer,
	requireVolunteerOrgContext,
} from "@/lib/volunteers";

type RouteContext = { params: Promise<{ id: string }> };

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
		request.nextUrl.searchParams.get("format")?.trim().toLowerCase() || "xlsx";

	const hours = await listApprovedHoursForVolunteer(ctx.orgId, id, from, to);
	const volunteerName =
		`${constituent.firstName} ${constituent.lastName}`.trim();

	if (format === "pdf") {
		const totalHours = hours.reduce((sum, h) => sum + h.minutesWorked, 0) / 60;
		const doc = React.createElement(
			Document,
			{ title: `Volunteer service letter — ${volunteerName}`, author: "CAALM" },
			React.createElement(
				PacketPage,
				{
					org: "CAALM",
					title: "Volunteer service letter",
				},
				React.createElement(PacketHeader, {
					eyebrow: "CAALM · Confidential",
					title: "Volunteer service letter",
					left: `${volunteerName} · approved hours only`,
					right: `Generated ${new Date().toISOString().slice(0, 10)}`,
				}),
				React.createElement(StatBand, {
					stats: [
						{ label: "Volunteer", value: volunteerName },
						{ label: "Approved entries", value: String(hours.length) },
						{ label: "Total hours", value: totalHours.toFixed(2) },
					],
				}),
				React.createElement(Heading, null, "Approved hours"),
				React.createElement(PacketTable, {
					columns: [
						{ header: "Date", width: "20%" },
						{ header: "Role", width: "50%" },
						{ header: "Hours", width: "30%", align: "right" },
					],
					rows: hours.map((h) => [
						h.workedAt.slice(0, 10),
						h.roleLabel || "Shift",
						(h.minutesWorked / 60).toFixed(2),
					]),
				}),
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

	return xlsxResponse(`volunteer-hours-${id}.xlsx`, {
		sheetName: "Volunteer Hours",
		title: `Approved Volunteer Hours — ${volunteerName}`,
		subtitle: `CAALM · ${hours.length} approved entr${hours.length === 1 ? "y" : "ies"} · Generated ${new Date().toISOString().slice(0, 10)}`,
		columns: [
			{ header: "Date", type: "date", width: 16 },
			{ header: "Role", width: 30 },
			{ header: "Minutes", type: "number", width: 12 },
			{ header: "Hours", type: "number", width: 12 },
			{ header: "Grant contract", width: 30 },
		],
		rows: hours.map((h) => [
			h.workedAt,
			h.roleLabel,
			h.minutesWorked,
			Number((h.minutesWorked / 60).toFixed(2)),
			h.grantContractId,
		]),
	});
}
