/** Calls back into the CAALM app — service-to-service, shared-secret auth (see
 * `src/app/api/audit-lab/practice/voice/turn/route.ts` in the main app). */
function apiBase(): string {
	const base = process.env.NEXT_PUBLIC_APP_URL;
	if (!base) throw new Error("Missing NEXT_PUBLIC_APP_URL env var");
	return base.replace(/\/$/, "");
}

function sharedSecret(): string {
	const secret = process.env.VOICE_AGENT_SHARED_SECRET;
	if (!secret) throw new Error("Missing VOICE_AGENT_SHARED_SECRET env var");
	return secret;
}

export async function recordTurn(params: {
	attemptId: string;
	questionId: string;
	question: string;
	answer: string;
	citedEvidence?: string;
}): Promise<void> {
	const res = await fetch(`${apiBase()}/api/audit-lab/practice/voice/turn`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-voice-agent-secret": sharedSecret(),
		},
		body: JSON.stringify(params),
	});
	if (!res.ok) {
		console.error("[voice-agent] recordTurn failed", await res.text());
	}
}
