import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	compress: true,
	poweredByHeader: false, // Remove X-Powered-By header for security

	// TypeScript configuration
	typescript: {
		ignoreBuildErrors: true,
	},

	// ESLint configuration - MIGRATED to .eslintrc.json (Next.js 16 requirement)

	// Compiler options
	compiler: {
		removeConsole:
			process.env.NODE_ENV === "production"
				? {
						exclude: ["error", "warn"],
					}
				: false,
	},

	// Webpack configuration for bundle optimization
	webpack: (config, { isServer }) => {
		// Exclude Node.js modules from client bundle
		if (!isServer) {
			config.resolve.fallback = {
				...config.resolve.fallback,
				dns: false,
				net: false,
				tls: false,
				fs: false,
				child_process: false,
			};

			// Optimize chunk splitting
			config.optimization = {
				...config.optimization,
				moduleIds: "deterministic",
				runtimeChunk: "single",
				splitChunks: {
					chunks: "all",
					cacheGroups: {
						default: false,
						vendors: false,
						// Separate vendor chunk for large libraries
						framework: {
							name: "framework",
							chunks: "all",
							test: /[\\/]node_modules[\\/](react|react-dom|scheduler|prop-types|use-subscription)[\\/]/,
							priority: 40,
							enforce: true,
						},
						// UI components chunk
						ui: {
							name: "ui",
							test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
							priority: 30,
							enforce: true,
						},
						// Utilities chunk
						utilities: {
							name: "utilities",
							test: /[\\/]node_modules[\\/](date-fns|lodash)[\\/]/,
							priority: 20,
							enforce: true,
						},
						// Contract upload components chunk
						contractUpload: {
							name: "contract-upload",
							test: /[\\/]src[\\/]components[\\/](ContractUploadForm|contract-upload)[\\/]/,
							priority: 25,
							enforce: true,
						},
						// Shared chunks
						common: {
							name: "common",
							minChunks: 2,
							priority: 10,
							reuseExistingChunk: true,
							enforce: true,
						},
					},
				},
			};
		}

		return config;
	},
	serverExternalPackages: ["ioredis"],
	experimental: {
		serverActions: {
			bodySizeLimit: "100MB",
		},
	},
	// Enable Turbopack explicitly
	turbopack: {},

	async redirects() {
		return [
			{
				source: "/dashboard/it/status",
				destination: "/dashboard/it/issuehistory",
				permanent: false,
			},
			{
				source: "/dashboard/it/status/:ticketId",
				destination: "/incident/:ticketId",
				permanent: false,
			},
		];
	},
	// Improve development caching for faster reloads
	...(process.env.NODE_ENV === "development" && {
		onDemandEntries: {
			maxInactiveAge: 60 * 1000, // Increase from 25s to 60s
			pagesBufferLength: 5, // Increase from 2 to 5
		},
	}),

	// Note: 'output: standalone' removed - not needed for Vercel deployment
	// Vercel handles build optimization automatically and doesn't use standalone output
	// Standalone output is only for Docker/Kubernetes container deployments

	// Optimize production builds
	// Note: swcMinify is now default in Next.js 16, removed deprecated option
	images: {
		formats: ["image/avif", "image/webp"],
		remotePatterns: [
			{
				protocol: "https",
				hostname: "cdn.pixabay.com",
			},
			{
				protocol: "https",
				hostname: "img.freepik.com",
			},
			{
				protocol: "https",
				hostname: "cloud.appwrite.io",
			},
			{
				protocol: "https",
				hostname: "fra.cloud.appwrite.io",
			},
			{
				protocol: "https",
				hostname: "api.qrserver.com",
			},
		],
	},
	async headers() {
		return [
			// Service worker — always revalidate so push handler updates propagate
			{
				source: "/sw.js",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate",
					},
					{
						key: "Service-Worker-Allowed",
						value: "/",
					},
				],
			},
			// Spline scenes are binary. Without nosniff, Chrome treats them as JSON
			// and shows its Pretty-print viewer if anything embeds the raw file.
			{
				source: "/scene.splinecode",
				headers: [
					{
						key: "Content-Type",
						value: "application/octet-stream",
					},
					{
						key: "X-Content-Type-Options",
						value: "nosniff",
					},
				],
			},
			// Static assets - cache aggressively in production, disable in dev
			{
				source: "/:all*(js|css|svg|png|jpg|jpeg|gif|webp|avif)",
				headers: [
					{
						key: "Cache-Control",
						value:
							process.env.NODE_ENV === "development"
								? "no-cache, no-store, must-revalidate"
								: "public, max-age=31536000, immutable",
					},
				],
			},
			// HTML/page routes - disable caching in development
			{
				source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
				headers: [
					{
						key: "Cache-Control",
						value:
							process.env.NODE_ENV === "development"
								? "no-cache, no-store, must-revalidate, max-age=0"
								: "public, max-age=0, must-revalidate",
					},
				],
			},
			// Analytics routes
			{
				source: "/analytics/:path*",
				headers: [
					{
						key: "Cache-Control",
						value: "no-cache, no-store, must-revalidate, max-age=0",
					},
					{
						key: "Pragma",
						value: "no-cache",
					},
					{
						key: "Expires",
						value: "0",
					},
					{
						key: "Last-Modified",
						value: new Date().toUTCString(),
					},
				],
			},
		];
	},
};

export default nextConfig;
