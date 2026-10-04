import { existsSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { type NextRequest, NextResponse } from "next/server";
import { requireITRole } from "@/lib/auth/it-guards";
import { CACHE_KEYS } from "@/lib/services/cache-keys";
import CacheManager from "@/lib/services/cache-manager";

/**
 * Calculate directory size recursively
 */
async function getDirectorySize(dirPath: string): Promise<number> {
	try {
		if (!existsSync(dirPath)) {
			return 0;
		}

		const stats = await stat(dirPath);
		if (!stats.isDirectory()) {
			return stats.size;
		}

		const entries = await readdir(dirPath, { withFileTypes: true });
		let totalSize = 0;

		for (const entry of entries) {
			const fullPath = join(dirPath, entry.name);

			if (entry.name.startsWith(".") && entry.name !== ".next") {
				continue;
			}

			try {
				if (entry.isDirectory()) {
					totalSize += await getDirectorySize(fullPath);
				} else {
					const fileStats = await stat(fullPath);
					totalSize += fileStats.size;
				}
			} catch {
				/* skip unreadable entries */
			}
		}

		return totalSize;
	} catch {
		return 0;
	}
}

function formatBytes(bytes: number): { size: number; unit: string } {
	if (bytes === 0) return { size: 0, unit: "B" };

	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));

	return {
		size: parseFloat((bytes / k ** i).toFixed(2)),
		unit: sizes[i],
	};
}

export async function GET(request: NextRequest) {
	const roleCheck = await requireITRole(request);
	if (roleCheck) return roleCheck;

	try {
		const cacheKey = CACHE_KEYS.it.storageMetrics();

		const metrics = await CacheManager.withCache(
			"it/storage-metrics",
			cacheKey,
			async () => {
				const projectRoot = process.cwd();

				const sourceCodeSize = await getDirectorySize(join(projectRoot, "src"));
				const testsSize = await getDirectorySize(join(projectRoot, "tests"));
				const publicAssetsSize = await getDirectorySize(
					join(projectRoot, "public"),
				);
				const nodeModulesSize = await getDirectorySize(
					join(projectRoot, "node_modules"),
				);
				const buildArtifactsSize = await getDirectorySize(
					join(projectRoot, ".next"),
				);

				let lockFileSize = 0;
				try {
					const lockFileStats = await stat(join(projectRoot, "pnpm-lock.yaml"));
					lockFileSize = lockFileStats.size;
				} catch {
					/* lock optional */
				}

				const sourceCodeTotal =
					sourceCodeSize + testsSize + publicAssetsSize + lockFileSize;
				const totalWithDeps = sourceCodeTotal + nodeModulesSize;
				const totalComplete = totalWithDeps + buildArtifactsSize;

				// Serverless hosts often have no local node_modules/.next — report honestly.
				const configured = totalComplete > 0;

				if (!configured) {
					return {
						configured: false,
						source: "local-disk-scan" as const,
						notice:
							"Local disk scan found no measurable project directories on this host (common on serverless). Appwrite file storage is separate — see Storage API usage.",
						sourceCode: formatBytes(0),
						dependencies: formatBytes(0),
						buildArtifacts: formatBytes(0),
						publicAssets: formatBytes(0),
						lockFile: formatBytes(0),
						total: formatBytes(0),
						componentBreakdown: [] as Array<{
							name: string;
							size: number;
							percentage: number;
						}>,
					};
				}

				const componentBreakdown = [
					{
						name: "node_modules",
						size: Math.round(nodeModulesSize / 1024 / 1024),
						percentage: Math.round((nodeModulesSize / totalComplete) * 100),
					},
					{
						name: ".next",
						size: Math.round(buildArtifactsSize / 1024 / 1024),
						percentage: Math.round((buildArtifactsSize / totalComplete) * 100),
					},
					{
						name: "src/",
						size: Math.round((sourceCodeSize / 1024 / 1024) * 10) / 10,
						percentage:
							Math.round((sourceCodeSize / totalComplete) * 100 * 10) / 10,
					},
					{
						name: "public/",
						size: Math.round((publicAssetsSize / 1024 / 1024) * 10) / 10,
						percentage:
							Math.round((publicAssetsSize / totalComplete) * 100 * 10) / 10,
					},
					{
						name: "tests/",
						size: Math.round((testsSize / 1024 / 1024) * 10) / 10,
						percentage: Math.round((testsSize / totalComplete) * 100 * 10) / 10,
					},
				].filter((item) => item.size > 0);

				return {
					configured: true,
					source: "local-disk-scan" as const,
					notice:
						"Sizes are from a local disk scan of this app host — not estimated multi-OS projections.",
					sourceCode: formatBytes(sourceCodeTotal),
					dependencies: formatBytes(nodeModulesSize),
					buildArtifacts: formatBytes(buildArtifactsSize),
					publicAssets: formatBytes(publicAssetsSize),
					lockFile: formatBytes(lockFileSize),
					total: formatBytes(totalComplete),
					componentBreakdown,
				};
			},
		);

		return NextResponse.json(metrics);
	} catch (error) {
		console.error("Error calculating storage metrics:", error);
		return NextResponse.json(
			{
				configured: false,
				error: "Failed to calculate storage metrics",
				notice: "Not configured — storage scan failed on this host.",
			},
			{ status: 500 },
		);
	}
}
