import { type NextRequest, NextResponse } from "next/server";
import {
	assertSignFieldsComplete,
	getEnvelope,
	publicSigningView,
	recordRecipientEvent,
} from "@/lib/esign/envelope-service";
import { EsignLinkError, esignErrorFromMessage } from "@/lib/esign/errors";
import { parseSigningToken } from "@/lib/esign/token";

function errorPayload(error: unknown, fallback: string) {
	if (error instanceof EsignLinkError) {
		return {
			body: { error: error.message, code: error.code },
			status: error.status,
		};
	}
	const message = error instanceof Error ? error.message : fallback;
	const mapped = esignErrorFromMessage(message);
	return { body: mapped, status: mapped.code === "ESIGN-404" ? 404 : 400 };
}

export async function GET(
	_request: NextRequest,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const parsed = parseSigningToken(decodeURIComponent(token));
	if (!parsed) {
		return NextResponse.json(
			{ error: "Invalid signing link", code: "ESIGN-404" },
			{ status: 404 },
		);
	}

	const envelope = await getEnvelope(parsed.envelopeId);
	if (!envelope) {
		return NextResponse.json(
			{ error: "Envelope not found", code: "ESIGN-404" },
			{ status: 404 },
		);
	}

	try {
		const viewed = await recordRecipientEvent({
			envelopeId: parsed.envelopeId,
			recipientId: parsed.recipientId,
			nextStatus: "viewed",
		});
		return NextResponse.json(publicSigningView(viewed, parsed.recipientId));
	} catch (error) {
		const payload = errorPayload(error, "Unavailable");
		return NextResponse.json(payload.body, { status: payload.status });
	}
}

export async function POST(
	request: NextRequest,
	context: { params: Promise<{ token: string }> },
) {
	const { token } = await context.params;
	const parsed = parseSigningToken(decodeURIComponent(token));
	if (!parsed) {
		return NextResponse.json(
			{ error: "Invalid signing link", code: "ESIGN-404" },
			{ status: 404 },
		);
	}

	const envelope = await getEnvelope(parsed.envelopeId);
	if (!envelope) {
		return NextResponse.json(
			{ error: "Envelope not found", code: "ESIGN-404" },
			{ status: 404 },
		);
	}

	const recipient = envelope.recipients.find((r) => r.id === parsed.recipientId);
	if (recipient?.status === "signed") {
		return NextResponse.json(
			{ error: "This document was already signed", code: "ESIGN-403" },
			{ status: 403 },
		);
	}

	const body = (await request.json()) as {
		action?: "sign" | "decline";
		signatureDataUrl?: string;
		fieldValues?: Record<string, string>;
	};

	try {
		if (body.action !== "decline") {
			assertSignFieldsComplete(
				envelope,
				parsed.recipientId,
				body.fieldValues,
				body.signatureDataUrl,
			);
		}
		const next = await recordRecipientEvent({
			envelopeId: parsed.envelopeId,
			recipientId: parsed.recipientId,
			nextStatus: body.action === "decline" ? "declined" : "signed",
			signatureDataUrl: body.signatureDataUrl,
			fieldValues: body.fieldValues,
		});
		return NextResponse.json(publicSigningView(next, parsed.recipientId));
	} catch (error) {
		const payload = errorPayload(error, "Sign failed");
		return NextResponse.json(payload.body, { status: payload.status });
	}
}
