export const STEP_UP_REQUIRED_CODE = "STEP_UP_REQUIRED";
export const STEP_UP_TTL_MS = 5 * 60 * 1000;

export async function fetchStepUpStatus(): Promise<{
	verified: boolean;
	expiresAt: string | null;
}> {
	const res = await fetch("/api/auth/step-up/status", { cache: "no-store" });
	if (!res.ok) {
		return { verified: false, expiresAt: null };
	}
	const body = await res.json().catch(() => ({}));
	return {
		verified: Boolean(body.verified),
		expiresAt: typeof body.expiresAt === "string" ? body.expiresAt : null,
	};
}

export async function isStepUpRequiredResponse(
	res: Response,
): Promise<boolean> {
	if (res.status !== 403) return false;
	try {
		const body = await res.clone().json();
		return body?.code === STEP_UP_REQUIRED_CODE;
	} catch {
		return false;
	}
}

/** Retry once after the caller obtains a step-up grant. */
export async function fetchWithStepUp(
	url: string,
	init: RequestInit,
	ensureStepUp: () => Promise<boolean>,
): Promise<Response> {
	const res = await fetch(url, init);
	if (!(await isStepUpRequiredResponse(res))) {
		return res;
	}
	const ok = await ensureStepUp();
	if (!ok) return res;
	return fetch(url, init);
}
