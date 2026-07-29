export async function broadcastNotificationToUser(
	userId: string,
	notification: Record<string, unknown>,
) {
	try {
		const { broadcastToUser } = await import(
			"@/app/api/notifications/sse/route"
		);
		await broadcastToUser(userId, notification);
	} catch (error) {
		console.warn("[broadcastNotificationToUser] SSE push failed:", error);
	}
}
