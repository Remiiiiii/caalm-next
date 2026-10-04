import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { suggestContractType } from "@/lib/ai/gemini";
import { requirePermission } from "@/lib/rbac/middleware";

export async function POST(request: NextRequest) {
	try {
		const denied = await requirePermission(request, {
			permission: [PERMISSIONS.CONTRACTS.CREATE, PERMISSIONS.AI.DOCUMENT_ANALYSIS],
		});
		if (denied) return denied;

		const body = await request.json();
		const { answers, freeText } = body as {
			answers: Array<{ questionId: string; answer: string }>;
			freeText?: string;
		};

		if (!Array.isArray(answers) || answers.length === 0) {
			return NextResponse.json(
				{ error: "answers array is required" },
				{ status: 400 },
			);
		}

		const suggestion = await suggestContractType(
			answers,
			typeof freeText === "string" ? freeText : undefined,
		);
		return NextResponse.json(suggestion);
	} catch (error) {
		console.error("AI contract type suggest error:", error);
		return NextResponse.json(
			{
				error: "Contract type suggestion failed",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 },
		);
	}
}
