/**
 * Regenerate src/lib/rbac/api-authz-baseline.json from the current API tree.
 *
 * Only run after reviewing unguarded routes — the CI ratchet forbids silent growth.
 *
 *   pnpm run api-authz:baseline
 */

import fs from "node:fs";
import {
	BASELINE_PATH,
	buildBaselineFromScan,
	scanApiAuthzMatrix,
} from "../src/lib/rbac/api-authz-matrix";

const routes = scanApiAuthzMatrix();
const baseline = buildBaselineFromScan(routes);
baseline.unguarded = [...baseline.unguarded].sort();

fs.writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`);

const counts = routes.reduce(
	(acc, r) => {
		acc[r.detected] = (acc[r.detected] ?? 0) + 1;
		return acc;
	},
	{} as Record<string, number>,
);

console.log("API authz matrix summary:");
console.log(counts);
console.log(
	`Wrote ${baseline.unguarded.length} grandfathered unguarded routes → ${BASELINE_PATH}`,
);
