#!/usr/bin/env node

/**
 * Test Redis connection and functionality
 * Run: node scripts/test-redis.js
 */

require("dotenv").config({ path: ".env.local" });

async function testRedis() {
	console.log("🧪 Testing Redis Connection...\n");

	// Check environment variables
	const hasVercelKV = !!process.env.KV_REST_API_URL;
	const hasStandardRedis = !!process.env.REDIS_URL;

	console.log("📋 Environment Check:");
	console.log(`   KV_REST_API_URL: ${hasVercelKV ? "✅ Set" : "❌ Not set"}`);
	console.log(`   REDIS_URL: ${hasStandardRedis ? "✅ Set" : "❌ Not set"}\n`);

	if (!hasVercelKV && !hasStandardRedis) {
		console.log("❌ No Redis configuration found!");
		console.log("\n📝 To activate Redis:");
		console.log("   1. For Vercel KV: Set KV_REST_API_URL in .env.local");
		console.log("   2. For Standard Redis: Set REDIS_URL in .env.local");
		console.log(
			"\n📖 See docs/REDIS_ACTIVATION_GUIDE.md for detailed instructions",
		);
		process.exit(1);
	}

	// Test using the health check endpoint
	console.log("🔍 Testing via Health Check API...\n");

	try {
		const response = await fetch("http://localhost:3000/api/cache/health");
		const data = await response.json();

		if (data.success) {
			console.log("✅ Redis Health Check Results:");
			console.log(
				`   Status: ${data.cache.healthy ? "✅ Healthy" : "❌ Unhealthy"}`,
			);
			console.log(`   Type: ${data.cache.type}`);
			console.log(`   Provider: ${data.cache.provider || "none"}`);
			console.log(`   Latency: ${data.cache.latency}ms`);
			if (data.cache.error) {
				console.log(`   Error: ${data.cache.error}`);
			}
			console.log(`   Message: ${data.message}\n`);

			if (data.cache.healthy) {
				console.log("🎉 Redis is working correctly!");
				process.exit(0);
			} else {
				console.log(
					"⚠️  Redis is configured but not healthy. Check the error above.",
				);
				process.exit(1);
			}
		} else {
			console.log("❌ Health check failed:", data.error);
			process.exit(1);
		}
	} catch (error) {
		console.log("❌ Failed to connect to health check endpoint");
		console.log(
			"   Make sure your development server is running: pnpm run dev",
		);
		console.log(`   Error: ${error.message}\n`);
		process.exit(1);
	}
}

testRedis();
