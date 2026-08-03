const rateLimitCache = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 60 * 1000;
const MAX_REQUESTS = 40;

export function checkAssistantRateLimit(userId: string): {
	allowed: boolean;
	remaining: number;
} {
	const now = Date.now();
	const key = `assistant:${userId}`;
	let record = rateLimitCache.get(key);
	if (!record || record.resetAt <= now) {
		record = { count: 0, resetAt: now + WINDOW_MS };
	}
	if (record.count >= MAX_REQUESTS) {
		return { allowed: false, remaining: 0 };
	}
	record.count += 1;
	rateLimitCache.set(key, record);
	return { allowed: true, remaining: MAX_REQUESTS - record.count };
}
