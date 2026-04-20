#!/usr/bin/env node

const { execSync } = require("node:child_process");

// Configuration
const DRY_RUN = false; // Set to false to actually delete environment variables
const ENVIRONMENTS = ["production", "preview", "development"]; // Environments to clean

function runCommand(command) {
	try {
		const output = execSync(command, { encoding: "utf8" });
		return output.trim();
	} catch (error) {
		console.error(`Error running command: ${command}`);
		console.error(error.message);
		return null;
	}
}

function getAllEnvironmentVariables() {
	console.log("🔍 Getting all environment variables...");

	const allEnvVars = [];

	// Get env vars for each environment
	for (const env of ENVIRONMENTS) {
		console.log(`📄 Fetching ${env} environment variables...`);

		const command = `vercel env ls ${env}`;
		const output = runCommand(command);

		if (!output) {
			console.warn(
				`⚠️  Failed to get ${env} environment variables (might be empty)`,
			);
			continue;
		}

		// Parse the output from vercel env ls
		// Format can vary, but typically shows variable names
		const lines = output.split("\n").filter((line) => line.trim());

		// Skip header lines, separators, and empty lines
		const envVarLines = lines.filter((line) => {
			const trimmed = line.trim();
			return (
				trimmed &&
				!trimmed.toLowerCase().includes("environment") &&
				!trimmed.toLowerCase().includes("name") &&
				!trimmed.toLowerCase().includes("value") &&
				!trimmed.startsWith("─") &&
				!trimmed.startsWith("═") &&
				!trimmed.startsWith("┌") &&
				!trimmed.startsWith("└") &&
				!trimmed.startsWith("│") &&
				!trimmed.startsWith("├") &&
				trimmed.length > 0 &&
				!trimmed.match(/^[-=]+$/) // Skip separator lines
			);
		});

		// Extract variable names
		envVarLines.forEach((line) => {
			// Variable name is typically the first word/token before whitespace or tab
			const trimmed = line.trim();
			const parts = trimmed.split(/\s+/);
			const varName = parts[0];

			// Validate that it looks like an environment variable name
			if (
				varName &&
				varName.length > 0 &&
				/^[A-Z_][A-Z0-9_]*$/i.test(varName) // Basic env var name pattern
			) {
				allEnvVars.push({
					name: varName,
					environment: env,
				});
			}
		});

		console.log(`   Found ${envVarLines.length} variable(s) in ${env}`);
	}

	// Remove duplicates (same variable name in multiple environments)
	const uniqueEnvVars = [];
	const seen = new Set();

	allEnvVars.forEach((envVar) => {
		const key = `${envVar.name}:${envVar.environment}`;
		if (!seen.has(key)) {
			seen.add(key);
			uniqueEnvVars.push(envVar);
		}
	});

	console.log(
		`\n📊 Total unique environment variables found: ${uniqueEnvVars.length}`,
	);
	return uniqueEnvVars;
}

function deleteEnvironmentVariable(envVar) {
	const command = `vercel env rm ${envVar.name} ${envVar.environment} --yes`;
	console.log(`🗑️  Deleting: ${envVar.name} (${envVar.environment})`);

	if (DRY_RUN) {
		console.log(`   [DRY RUN] Would run: ${command}`);
		return true;
	}

	const output = runCommand(command);
	if (output !== null) {
		console.log(`   ✅ Deleted successfully`);
		return true;
	} else {
		console.log(`   ❌ Failed to delete`);
		return false;
	}
}

function cleanupEnvironmentVariables() {
	console.log("🚀 Vercel Environment Variables Cleanup Script");
	console.log("===============================================\n");

	if (DRY_RUN) {
		console.log(
			"⚠️  DRY RUN MODE - No environment variables will actually be deleted",
		);
		console.log("   Set DRY_RUN = false to perform actual deletions\n");
	}

	// Check if Vercel CLI is installed
	try {
		runCommand("vercel --version");
	} catch (_error) {
		console.error("❌ Vercel CLI not found. Please install it first:");
		console.error("   npm i -g vercel");
		process.exit(1);
	}

	// Check if user is logged in
	try {
		runCommand("vercel whoami");
	} catch (_error) {
		console.error("❌ Not logged in to Vercel. Please login first:");
		console.error("   vercel login");
		process.exit(1);
	}

	// Get all environment variables
	const allEnvVars = getAllEnvironmentVariables();

	if (!allEnvVars || allEnvVars.length === 0) {
		console.log("✅ No environment variables found. Nothing to delete.");
		return;
	}

	console.log(`\n🎯 Deleting ${allEnvVars.length} environment variable(s):\n`);

	let deletedCount = 0;
	let failedCount = 0;

	allEnvVars.forEach((envVar, index) => {
		console.log(`[${index + 1}/${allEnvVars.length}]`);
		const success = deleteEnvironmentVariable(envVar);
		if (success) {
			deletedCount++;
		} else {
			failedCount++;
		}
	});

	console.log("\n📊 Cleanup Summary:");
	console.log(`   ✅ Successfully deleted: ${deletedCount}`);
	console.log(`   ❌ Failed to delete: ${failedCount}`);

	if (DRY_RUN) {
		console.log(
			"\n⚠️  This was a DRY RUN. To actually delete environment variables:",
		);
		console.log("   1. Set DRY_RUN = false in this script");
		console.log("   2. Run the script again");
	} else {
		console.log("\n✅ Cleanup complete!");
	}
}

// Run the cleanup
cleanupEnvironmentVariables();
