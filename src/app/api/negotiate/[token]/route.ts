import { type NextRequest, NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { resolveAccessByToken } from "@/lib/contracts/negotiation/access.service";
import { listComments } from "@/lib/contracts/negotiation/comments.service";
import { resolveNegotiateSession } from "@/lib/contracts/negotiation/session.service";
import { listVersions } from "@/lib/contracts/negotiation/versions.service";
import { getProfilePictureUrl } from "@/lib/utils";

type RouteContext = { params: Promise<{ token: string }> };

function ownerImageUrl(user: {
	avatar?: string | null;
	profileImageId?: string | null;
}): string | null {
	const avatarValue = String(user.avatar || "").trim();
	if (avatarValue && /^https?:\/\//i.test(avatarValue)) return avatarValue;
	if (avatarValue.startsWith("/")) return avatarValue;
	const fileId =
		(avatarValue &&
		!avatarValue.includes("avatar-placeholder") &&
		!avatarValue.startsWith("/") &&
		!/^https?:\/\//i.test(avatarValue)
			? avatarValue
			: null) ||
		String(user.profileImageId || "").trim() ||
		null;
	return getProfilePictureUrl(fileId);
}

export async function GET(request: NextRequest, context: RouteContext) {
	const { token } = await context.params;
	const access = await resolveAccessByToken(token);
	if (!access) {
		return NextResponse.json(
			{ error: "Link expired or invalid" },
			{ status: 401 },
		);
	}

	const { tablesDB } = await createAdminClient();
	const contract = await tablesDB.getRow({
		databaseId: appwriteConfig.databaseId!,
		tableId: appwriteConfig.contractsCollectionId!,
		rowId: access.contractId,
	});

	const ownerId = String(
		(contract as { contractOwnerId?: string; owner?: string })
			.contractOwnerId ||
			(contract as { owner?: string }).owner ||
			"",
	).trim();
	let owner: { name: string; email: string; imageUrl?: string | null } | null =
		null;
	if (ownerId) {
		try {
			let user: {
				fullName?: string;
				email?: string;
				avatar?: string | null;
				profileImageId?: string | null;
			} | null = null;
			try {
				user = (await tablesDB.getRow({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.usersCollectionId!,
					rowId: ownerId,
				})) as typeof user;
			} catch {
				const byAccount = await tablesDB.listRows({
					databaseId: appwriteConfig.databaseId!,
					tableId: appwriteConfig.usersCollectionId!,
					queries: [Query.equal("accountId", ownerId), Query.limit(1)],
				});
				user = (byAccount.rows?.[0] as typeof user) || null;
			}
			if (user?.email) {
				owner = {
					email: String(user.email).toLowerCase(),
					name: String(user.fullName || user.email).trim(),
					imageUrl: ownerImageUrl(user),
				};
			}
		} catch {
			/* best-effort */
		}
	}

	const session = resolveNegotiateSession(request, access);
	const lifecycleStatus = String(
		(contract as { lifecycleStatus?: string }).lifecycleStatus || "draft",
	);
	const metadata = {
		authenticated: Boolean(session),
		contractName: String(
			(contract as { contractName?: string }).contractName || "Contract draft",
		),
		lifecycleStatus,
		expiresAt: access.expiresAt,
		invitees: access.invitees,
		owner,
		sessionEmail: session?.invitee.email || null,
	};

	// Without a verified session, never return document text or comments.
	if (!session) {
		return NextResponse.json(metadata);
	}

	const versions = await listVersions(access.contractId);
	const latest = versions[0] || null;
	const comments = await listComments(access.contractId);
	const sharedComments = comments.filter(
		(comment) => comment.visibility !== "internal",
	);

	return NextResponse.json({
		...metadata,
		counterpartyEmail: access.counterpartyEmail,
		counterpartyName: access.counterpartyName,
		version: latest,
		comments: sharedComments,
	});
}
