#!/usr/bin/env node
// PreToolUse guard for .cursor/rules/appwrite-collection-ids.mdc:
// Appwrite table/bucket/collection $id must be alphanumeric (e.g.
// 685ed8a60030f6d7b1f3), never a human-readable name (e.g. ui_load_incidents).
// Blocks the call before it reaches Appwrite instead of relying on memory.

let input = "";
process.stdin.on("data", (chunk) => {
	input += chunk;
});
process.stdin.on("end", () => {
	try {
		const payload = JSON.parse(input || "{}");
		const toolInput = payload.tool_input || {};
		const op = toolInput.tool_name || "";

		if (!/create_(table|bucket|collection)/i.test(op)) {
			process.exit(0);
		}

		const args = toolInput.arguments || {};
		const id = args.table_id || args.bucket_id || args.collection_id;

		if (!id) {
			console.error(
				`[check-appwrite-id] no table_id/bucket_id/collection_id found for op "${op}" — allowing (fail open)`,
			);
			process.exit(0);
		}

		if (/^[A-Za-z0-9]+$/.test(id)) {
			process.exit(0);
		}

		const reason =
			`Blocked: Appwrite resource IDs must be alphanumeric (e.g. 685ed8a60030f6d7b1f3), ` +
			`not a human-readable name like '${id}'. See .cursor/rules/appwrite-collection-ids.mdc. ` +
			`Generate a random alphanumeric id instead (e.g. via crypto.randomBytes) and retry.`;

		console.log(
			JSON.stringify({
				hookSpecificOutput: {
					hookEventName: "PreToolUse",
					permissionDecision: "deny",
					permissionDecisionReason: reason,
				},
			}),
		);
		process.exit(0);
	} catch (err) {
		console.error(
			`[check-appwrite-id] parse error, allowing (fail open): ${err.message}`,
		);
		process.exit(0);
	}
});
