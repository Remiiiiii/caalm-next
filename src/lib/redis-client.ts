/**
 * Layerbase Redis Client
 * Centralized Redis client with TLS/SNI configuration for Layerbase
 */

import { Redis } from "ioredis";

interface GlobalRedis {
	cachedRedisClient: Redis | undefined;
}

declare global {
	// eslint-disable-next-line no-var
	var cachedRedisClient: Redis | undefined;
}

const REDIS_URL = process.env.REDIS_URL || "redis://127.0.0.1:6379";

// Extract the raw hostname from your URL string to safely feed the TLS SNI rules
const dbHost = new URL(REDIS_URL).hostname;

function createRedisInstance(): Redis {
	const client = new Redis(REDIS_URL, {
		connectTimeout: 5000,
		maxRetriesPerRequest: 3,
		lazyConnect: true,
		retryStrategy(times) {
			return Math.min(times * 100, 3000);
		},
		// REQUIRED FOR LAYERBASE: Forces node/ioredis to forward correct SNI routing info
		tls: {
			servername: dbHost,
		},
	});

	client.on("connect", () =>
		console.log("⚡ Layerbase Connected Successfully"),
	);
	client.on("error", (err) =>
		console.error("❌ Layerbase Connection Error:", err),
	);

	return client;
}

const redis = global.cachedRedisClient ?? createRedisInstance();

if (process.env.NODE_ENV !== "production") {
	global.cachedRedisClient = redis;
}

export default redis;
