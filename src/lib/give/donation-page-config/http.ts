import { NextResponse } from "next/server";
import { DonationPageConfigError } from "./errors";

export function donationPageConfigErrorResponse(error: unknown) {
	if (error instanceof DonationPageConfigError) {
		return NextResponse.json(
			{ error: error.message, code: error.code },
			{ status: error.status },
		);
	}
	console.error("[donation-page-config]", error);
	return NextResponse.json({ error: "Request failed" }, { status: 500 });
}
