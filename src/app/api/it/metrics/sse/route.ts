/**
 * IT Metrics SSE — honest empty stream.
 * Does not emit random CPU / request totals.
 */

import type { NextRequest } from "next/server";
import { requireITRole } from "@/lib/auth/it-guards";

export async function GET(request: NextRequest) {
	const roleCheck = await requireITRole(request);
	if (roleCheck) return roleCheck;

	const encoder = new TextEncoder();
	const stream = new ReadableStream({
		start(controller) {
			const payload = {
				configured: false,
				notice:
					"Real-time host metrics are not configured. Connect an observability backend before enabling live CPU and request graphs.",
				timestamp: new Date().toISOString(),
			};

			controller.enqueue(
				encoder.encode(`data: ${JSON.stringify(payload)}\n\n`),
			);

			// Keep the SSE channel open with comment heartbeats (no fake metrics).
			const heartbeat = setInterval(() => {
				try {
					controller.enqueue(encoder.encode(": heartbeat\n\n"));
				} catch {
					clearInterval(heartbeat);
				}
			}, 30000);

			request.signal.addEventListener("abort", () => {
				clearInterval(heartbeat);
				try {
					controller.close();
				} catch {
					/* already closed */
				}
			});
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
		},
	});
}
