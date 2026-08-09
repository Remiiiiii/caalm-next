/**
 * Daily cron: delete Appwrite Auth users created for the demo sandbox
 * (email *@caalm.demo) once they are older than DEMO_USER_TTL_DAYS (default 7).
 *
 * Safety: never deletes users outside the @caalm.demo domain.
 */

const { Client, Users, Query } = require("node-appwrite");

const DEMO_EMAIL_SUFFIX = "@caalm.demo";
const DEFAULT_TTL_DAYS = 7;

function getTtlMs() {
	const raw = process.env.DEMO_USER_TTL_DAYS || process.env.DEMO_ORG_TTL_DAYS;
	const days = raw ? Number.parseInt(raw, 10) : DEFAULT_TTL_DAYS;
	const safeDays = Number.isFinite(days) && days > 0 ? days : DEFAULT_TTL_DAYS;
	return safeDays * 24 * 60 * 60 * 1000;
}

function isDemoSandboxEmail(email) {
	return (
		typeof email === "string" &&
		email.toLowerCase().endsWith(DEMO_EMAIL_SUFFIX)
	);
}

module.exports = async ({ req, res, log, error }) => {
	const endpoint = process.env.APPWRITE_FUNCTION_API_ENDPOINT;
	const projectId = process.env.APPWRITE_FUNCTION_PROJECT_ID;
	const apiKey = req.headers["x-appwrite-key"];

	if (!endpoint || !projectId || !apiKey) {
		error("Missing Appwrite function runtime credentials");
		return res.json(
			{ success: false, error: "Missing runtime credentials" },
			500,
		);
	}

	const client = new Client()
		.setEndpoint(endpoint)
		.setProject(projectId)
		.setKey(apiKey);
	const users = new Users(client);

	const cutoff = Date.now() - getTtlMs();
	const deleted = [];
	const skipped = [];
	const errors = [];

	let cursor = undefined;
	let scanned = 0;

	try {
		// Paginate all Auth users; filter in-process for demo emails + age.
		for (;;) {
			const queries = [Query.limit(100)];
			if (cursor) {
				queries.push(Query.cursorAfter(cursor));
			}

			const page = await users.list(queries);
			// node-appwrite v14 accepts Query[] directly
			if (!page.users || page.users.length === 0) break;

			for (const user of page.users) {
				scanned += 1;
				cursor = user.$id;

				if (!isDemoSandboxEmail(user.email)) {
					continue;
				}

				const createdAt = Date.parse(user.$createdAt);
				if (!Number.isFinite(createdAt) || createdAt > cutoff) {
					skipped.push({
						id: user.$id,
						email: user.email,
						reason: "within_ttl",
					});
					continue;
				}

				try {
					await users.delete(user.$id);
					deleted.push({ id: user.$id, email: user.email });
					log(`Deleted demo auth user ${user.$id} (${user.email})`);
				} catch (err) {
					const message = err instanceof Error ? err.message : String(err);
					errors.push({ id: user.$id, email: user.email, error: message });
					error(`Failed to delete ${user.$id}: ${message}`);
				}
			}

			if (page.users.length < 100) break;
		}

		return res.json({
			success: true,
			scanned,
			deletedCount: deleted.length,
			deleted,
			skippedCount: skipped.length,
			errors,
		});
	} catch (err) {
		const message = err instanceof Error ? err.message : String(err);
		error(message);
		return res.json({ success: false, error: message }, 500);
	}
};
