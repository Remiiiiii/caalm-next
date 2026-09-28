import { type NextRequest, NextResponse } from "next/server";
import { sendEmailOTP } from "@/lib/actions/user.actions";
import { demoRequestSchema } from "@/lib/demo-request/schema";
import { mailgunService } from "@/lib/services/mailgun";

export async function POST(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}

	const parsed = demoRequestSchema.safeParse(body);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Check the form fields", issues: parsed.error.flatten() },
			{ status: 400 },
		);
	}

	const lead = parsed.data;
	const notifyTo =
		process.env.DEMO_REQUEST_NOTIFY_EMAIL || "support@caalmsolutions.com";

	try {
		await mailgunService.sendEmail({
			to: notifyTo,
			subject: `Demo request: ${lead.companyName}`,
			text: [
				`Name: ${lead.firstName} ${lead.lastName}`,
				`Email: ${lead.email}`,
				`Company: ${lead.companyName}`,
				`Size: ${lead.companySize}`,
				`Phone: ${lead.phone}`,
				`Message: ${lead.message || "(none)"}`,
			].join("\n"),
		});
	} catch (error) {
		console.error("Demo request notify failed:", error);
	}

	try {
		await sendEmailOTP({ email: lead.email });
	} catch (error) {
		const message =
			error instanceof Error
				? error.message
				: "Could not send a verification code";
		return NextResponse.json({ error: message }, { status: 400 });
	}

	return NextResponse.json({ ok: true, email: lead.email });
}
