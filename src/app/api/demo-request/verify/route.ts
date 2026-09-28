import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOTP } from "@/lib/actions/user.actions";
import {
	demoVerifiedCookieName,
	signDemoVerifiedCookie,
} from "@/lib/demo-request/verified-cookie";

const bodySchema = z.object({
	email: z.string().email(),
	otp: z.string().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export async function POST(request: NextRequest) {
	let json: unknown;
	try {
		json = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
	}
	const parsed = bodySchema.safeParse(json);
	if (!parsed.success) {
		return NextResponse.json(
			{ error: "Enter the 6-digit code from your email" },
			{ status: 400 },
		);
	}

	try {
		await verifyOTP({
			email: parsed.data.email,
			otp: parsed.data.otp,
		});
	} catch {
		return NextResponse.json(
			{ error: "That code is invalid or expired" },
			{ status: 400 },
		);
	}

	const response = NextResponse.json({ ok: true });
	response.cookies.set({
		name: demoVerifiedCookieName(),
		value: signDemoVerifiedCookie(parsed.data.email),
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		path: "/",
		maxAge: 30 * 60,
	});
	return response;
}
