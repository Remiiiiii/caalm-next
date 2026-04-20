import { type NextRequest, NextResponse } from "next/server";
import { PERMISSIONS } from "@/constants/permissions";
import { getCurrentUser } from "@/lib/actions/user.actions";
import {
	deleteNewsArticle,
	publishNewsArticle,
	updateNewsArticle,
} from "@/lib/database/news-articles";
import { getUserPermissions } from "@/lib/rbac/permissions";

export async function POST(request: NextRequest) {
	try {
		// Check authentication
		const user = await getCurrentUser();
		if (!user) {
			return NextResponse.json(
				{ success: false, error: "Unauthorized" },
				{ status: 401 },
			);
		}

		// Parse request body
		const body = await request.json();
		const { articleIds, action, data } = body;

		if (!Array.isArray(articleIds) || articleIds.length === 0) {
			return NextResponse.json(
				{ success: false, error: "Article IDs are required" },
				{ status: 400 },
			);
		}

		if (!action || typeof action !== "string") {
			return NextResponse.json(
				{ success: false, error: "Action is required" },
				{ status: 400 },
			);
		}

		// Check permissions based on action
		const userPermissions = await getUserPermissions(user.$id);
		let requiredPermission: string;

		switch (action) {
			case "delete":
				requiredPermission = PERMISSIONS.NEWS.DELETE;
				break;
			case "publish":
			case "unpublish":
				requiredPermission = PERMISSIONS.NEWS.PUBLISH;
				break;
			case "update":
				requiredPermission = PERMISSIONS.NEWS.UPDATE;
				break;
			default:
				return NextResponse.json(
					{ success: false, error: `Unknown action: ${action}` },
					{ status: 400 },
				);
		}

		if (!userPermissions.includes(requiredPermission as any)) {
			return NextResponse.json(
				{
					success: false,
					error: `Permission denied. You need ${requiredPermission} permission.`,
				},
				{ status: 403 },
			);
		}

		// Process bulk operations
		const results = await Promise.allSettled(
			articleIds.map(async (articleId: string) => {
				try {
					switch (action) {
						case "delete":
							await deleteNewsArticle(articleId, data?.hardDelete || false);
							return { articleId, success: true };
						case "publish":
							await publishNewsArticle(articleId, true);
							return { articleId, success: true };
						case "unpublish":
							await publishNewsArticle(articleId, false);
							return { articleId, success: true };
						case "update":
							if (!data) {
								throw new Error("Update data is required");
							}
							await updateNewsArticle(articleId, data);
							return { articleId, success: true };
						default:
							throw new Error(`Unknown action: ${action}`);
					}
				} catch (error: any) {
					return {
						articleId,
						success: false,
						error: error.message || "Operation failed",
					};
				}
			}),
		);

		// Format results
		const formattedResults = results.map((result, index) => {
			if (result.status === "fulfilled") {
				return result.value;
			} else {
				return {
					articleId: articleIds[index],
					success: false,
					error: result.reason?.message || "Operation failed",
				};
			}
		});

		const successCount = formattedResults.filter((r) => r.success).length;
		const failureCount = formattedResults.length - successCount;

		return NextResponse.json({
			success: true,
			results: formattedResults,
			summary: {
				total: formattedResults.length,
				successful: successCount,
				failed: failureCount,
			},
		});
	} catch (error: any) {
		console.error("Error performing bulk action:", error);
		return NextResponse.json(
			{
				success: false,
				error: error.message || "Failed to perform bulk action",
			},
			{ status: 500 },
		);
	}
}
