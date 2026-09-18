import { type NextRequest, NextResponse } from "next/server";
import { getCurrentUser, updateUserProfile } from "@/lib/actions/user.actions";
import CacheManager from "@/lib/services/cache-manager";

/** Fields that would escalate privilege or rewrite someone else's account. */
const DISALLOWED_SELF_SERVICE_FIELDS = [
	"accountId",
	"role",
	"status",
	"division",
	"department",
	"email",
	"managerUserId",
	"matrixManagerUserId",
	"jobTitle",
	"workLocation",
	"costCenterId",
	"primaryOrgUnitId",
	"departmentId",
	"divisionId",
] as const;

const MAX_FULL_NAME_LENGTH = 128;

function methodNotAllowed() {
	return new NextResponse("Method Not Allowed", { status: 405 });
}

export async function PATCH(req: NextRequest) {
	try {
		const currentUser = await getCurrentUser();
		if (!currentUser) {
			return NextResponse.json(
				{ error: "Authentication required" },
				{ status: 401 },
			);
		}

		const body = (await req.json().catch(() => null)) as Record<
			string,
			unknown
		> | null;
		if (!body || typeof body !== "object") {
			return NextResponse.json(
				{ error: "Invalid request body" },
				{ status: 400 },
			);
		}

		const attemptedEscalation = DISALLOWED_SELF_SERVICE_FIELDS.filter(
			(key) => body[key] !== undefined,
		);
		if (attemptedEscalation.length > 0) {
			return NextResponse.json(
				{
					error:
						"Only your display name can be updated here. Role, email, and org placement stay admin-managed.",
				},
				{ status: 400 },
			);
		}

		const fullName =
			typeof body.fullName === "string" ? body.fullName.trim() : "";
		if (!fullName) {
			return NextResponse.json(
				{ error: "fullName is required" },
				{ status: 400 },
			);
		}
		if (fullName.length > MAX_FULL_NAME_LENGTH) {
			return NextResponse.json(
				{
					error: `fullName must be ${MAX_FULL_NAME_LENGTH} characters or fewer`,
				},
				{ status: 400 },
			);
		}

		const accountId = String(currentUser.accountId || "").trim();
		if (!accountId) {
			return NextResponse.json({ error: "Account not found" }, { status: 400 });
		}

		const result = await updateUserProfile({
			accountId,
			fullName,
		});
		if (!result?.user) {
			return NextResponse.json(
				{ error: "Failed to update profile" },
				{ status: 500 },
			);
		}
		const { user: updatedUser } = result;

		await CacheManager.invalidateUsers(
			currentUser.email,
			currentUser.$id,
			accountId,
			fullName,
		);

		return NextResponse.json({ user: updatedUser });
	} catch (error) {
		console.error("[SERVER] PATCH /api/user/profile:", error);
		const message =
			error instanceof Error ? error.message : "Failed to update profile";
		return NextResponse.json({ error: message }, { status: 500 });
	}
}

export function GET() {
	return methodNotAllowed();
}

export function POST() {
	return methodNotAllowed();
}

export function PUT() {
	return methodNotAllowed();
}

export function DELETE() {
	return methodNotAllowed();
}
