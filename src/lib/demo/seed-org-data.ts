/**
 * Seed fictional org-scoped data for a visitor sandbox (v2).
 */

import { DEMO_SEED_VERSION, MIN_TEAM_USERS } from "./seed/constants";
import { countUsersByOrg } from "./seed/helpers";
import { seedDemoAnalytics } from "./seed/seed-analytics";
import {
	bumpOrgSeedVersion,
	getOrgSeedVersion,
	seedDemoCoreData,
} from "./seed/seed-core";
import { seedDemoDocuments } from "./seed/seed-documents";
import { seedDemoSecondary } from "./seed/seed-secondary";
import { seedDemoTeamUsers } from "./seed/seed-team-users";

export { DEMO_SEED_VERSION, MIN_TEAM_USERS };
export { bumpOrgSeedVersion, getOrgSeedVersion, countUsersByOrg };

export async function seedDemoOrgData({
	orgId,
	userId,
	ownerEmail,
	ownerName,
	force = false,
}: {
	orgId: string;
	userId: string;
	ownerEmail: string;
	ownerName: string;
	force?: boolean;
}): Promise<void> {
	const currentVersion = await getOrgSeedVersion(orgId);
	const teamCount = await countUsersByOrg(orgId);
	const needsSeed =
		force ||
		currentVersion < DEMO_SEED_VERSION ||
		teamCount < MIN_TEAM_USERS;

	if (!needsSeed && currentVersion >= DEMO_SEED_VERSION) {
		return;
	}

	const team = await seedDemoTeamUsers({
		orgId,
		ownerUserId: userId,
	});

	await seedDemoDocuments({
		orgId,
		ownerUserId: userId,
		ownerName,
	});

	await seedDemoCoreData({
		orgId,
		ownerUserId: userId,
		ownerName,
		ownerEmail,
		team,
	});

	await seedDemoAnalytics({
		orgId,
		ownerUserId: userId,
		ownerName,
		ownerEmail,
		team,
	});

	await seedDemoSecondary({
		orgId,
		ownerUserId: userId,
	});

	await bumpOrgSeedVersion(orgId, DEMO_SEED_VERSION);
}
