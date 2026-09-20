export { createConstituentWithDuplicateGate } from "./create-constituent.service";
export type {
	CreateConstituentActor,
	CreateConstituentResult,
} from "./create-constituent.service";
export {
	matchesDuplicateSignals,
	normalizeEmail,
	normalizeFirstName,
	normalizeLastName,
	toDuplicateCandidates,
} from "./duplicates";
export {
	createConstituent,
	deleteConstituent,
	findDuplicateConstituents,
	getConstituentById,
	listConstituents,
	markPiiAccessed,
	parseDoNotContactParam,
	parseTypeParam,
	updateConstituent,
} from "./repository";
export { requireConstituentOrgContext } from "./request-context";
export type { ConstituentOrgContext } from "./request-context";
export type {
	Constituent,
	ConstituentDuplicateCandidate,
	ConstituentListFilters,
	ConstituentType,
	CreateConstituentInput,
	UpdateConstituentInput,
} from "./types";
export { CONSTITUENT_TYPES, isConstituentType } from "./types";
