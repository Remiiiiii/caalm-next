import { createNewsArticle, listNewsArticles } from "@/lib/database/news-articles";
import { getNewsSystemSettings } from "@/lib/database/news-system-settings";

export type SystemNewsKind =
	| "contract_renewal"
	| "policy_update"
	| "regulation_alert";

export async function maybeCreateSystemNewsItem(params: {
	orgId: string;
	kind: SystemNewsKind;
	title: string;
	excerpt: string;
	externalId: string;
}): Promise<boolean> {
	const settings = await getNewsSystemSettings(params.orgId);
	if (!settings) return false;
	if (params.kind === "contract_renewal" && !settings.enableContractRenewal) {
		return false;
	}
	if (params.kind === "policy_update" && !settings.enablePolicyUpdates) {
		return false;
	}
	if (
		params.kind === "regulation_alert" &&
		!settings.enableRegulationAlerts
	) {
		return false;
	}

	const existing = await listNewsArticles({
		orgId: params.orgId,
		search: params.title,
		limit: 20,
		status: "all",
	});
	if (
		existing.articles.some(
			(article) =>
				article.source === "system" && article.externalId === params.externalId,
		)
	) {
		return false;
	}

	await createNewsArticle({
		title: params.title,
		content: params.excerpt,
		excerpt: params.excerpt,
		authorId: "system",
		author: "CAALM",
		type: "alert",
		priority: "high",
		status: "draft",
		source: "system",
		externalId: params.externalId,
		orgId: params.orgId,
	});
	return true;
}
