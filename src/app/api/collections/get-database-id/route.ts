import { type NextRequest, NextResponse } from "next/server";
import { appwriteConfig } from "@/lib/appwrite/config";

export async function GET(_request: NextRequest) {
	return NextResponse.json({
		databaseId: appwriteConfig.databaseId,
	});
}
