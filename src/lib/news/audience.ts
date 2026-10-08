export type NewsAudienceArticle = {
	status?: string | null;
	publishAt?: string | null;
	scheduledAt?: string | null;
	publishedAt?: string | null;
	departments?: string[] | null;
	department?: string | null;
	roles?: string[] | null;
};

export type NewsReaderAudience = {
	department?: string | null;
	roleNames?: string[];
	now?: Date;
};

function parseTime(value?: string | null): number | null {
	if (!value) return null;
	const ms = Date.parse(value);
	return Number.isNaN(ms) ? null : ms;
}

function list(values?: string[] | string | null): string[] {
	if (!values) return [];
	if (Array.isArray(values)) {
		return values.map((value) => value.trim()).filter(Boolean);
	}
	return values
		.split(",")
		.map((value) => value.trim())
		.filter(Boolean);
}

/**
 * A published article is visible when:
 * - it is published
 * - publish time is empty or already passed
 * - departments is empty (everyone) or includes the reader's department
 * - roles is empty (everyone) or overlaps the reader's role names
 */
export function isArticleVisibleToAudience(
	article: NewsAudienceArticle,
	audience: NewsReaderAudience,
): boolean {
	if (article.status !== "published") return false;

	const now = audience.now?.getTime() ?? Date.now();
	const goLive =
		parseTime(article.publishAt) ??
		parseTime(article.scheduledAt) ??
		parseTime(article.publishedAt);
	if (goLive !== null && goLive > now) return false;

	const departments = list(article.departments);
	if (article.department?.trim()) {
		departments.push(article.department.trim());
	}
	const uniqueDepartments = [...new Set(departments)];
	if (uniqueDepartments.length > 0) {
		const readerDept = audience.department?.trim();
		if (!readerDept || !uniqueDepartments.includes(readerDept)) {
			return false;
		}
	}

	const roles = list(article.roles);
	if (roles.length > 0) {
		const readerRoles = new Set(audience.roleNames ?? []);
		if (!roles.some((role) => readerRoles.has(role))) {
			return false;
		}
	}

	return true;
}

export function isEligibleForScheduledPublish(
	article: {
		status?: string | null;
		publishAt?: string | null;
		scheduledAt?: string | null;
	},
	now: Date = new Date(),
): boolean {
	const when = parseTime(article.publishAt) ?? parseTime(article.scheduledAt);
	if (when === null || when > now.getTime()) return false;
	return article.status === "scheduled" || article.status === "draft";
}
