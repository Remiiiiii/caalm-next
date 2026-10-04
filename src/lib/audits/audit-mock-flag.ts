/**
 * Controls whether audit compliance domains may show illustrative (mock) KPIs/charts.
 *
 * Production defaults OFF. Turn on only with NEXT_PUBLIC_AUDIT_MOCK_DATA=true,
 * or in development / APP_MODE=demo for sales demos.
 */
export function resolveUseAuditMockData(input: {
	explicit?: string | undefined;
	nodeEnv?: string | undefined;
	appMode?: string | undefined;
}): boolean {
	const explicit = input.explicit?.trim().toLowerCase();
	if (explicit === "true") return true;
	if (explicit === "false") return false;

	const appMode = input.appMode?.trim().toLowerCase();
	if (appMode === "demo") return true;

	const nodeEnv = input.nodeEnv ?? "production";
	return nodeEnv === "development";
}

export function isAuditMockDataEnabled(): boolean {
	return resolveUseAuditMockData({
		explicit: process.env.NEXT_PUBLIC_AUDIT_MOCK_DATA,
		nodeEnv: process.env.NODE_ENV,
		appMode: process.env.APP_MODE || process.env.NEXT_PUBLIC_APP_MODE,
	});
}
