export type { ConstituentActor } from "./audit";
export {
	buildConstituentPiiViewEntry,
	CONSTITUENT_PII_VIEW_ACTION,
	constituentActorFromUser,
	logConstituentAudit,
	logConstituentPiiView,
} from "./audit";
export {
	CAN_CONTACT_FUTURE_SENDER_PATHS,
	CAN_CONTACT_REQUIRED_SENDER_PATHS,
	canContact,
} from "./consent";
export type {
	CreateConstituentActor,
	CreateConstituentResult,
} from "./create-constituent.service";
export { createConstituentWithDuplicateGate } from "./create-constituent.service";
export {
	CONSTITUENT_DNC_BADGE_CLASS,
	constituentDisplayName,
	constituentTypeBadgeClass,
	constituentTypeLabel,
} from "./display";
export {
	matchesDuplicateSignals,
	normalizeEmail,
	normalizeFirstName,
	normalizeLastName,
	toDuplicateCandidates,
} from "./duplicates";
export type { MergeFieldDiff, MergePreview } from "./merge";
export {
	commitConstituentMerge,
	previewConstituentMerge,
} from "./merge";
export {
	createNote,
	deleteNote,
	getNoteById,
	listNotesForConstituent,
} from "./notes";
export {
	createRelationship,
	deleteRelationship,
	getRelationshipById,
	isSelfLink,
	listRelationshipsForConstituent,
	wouldCreateCycle,
} from "./relationships";
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
export type { ConstituentOrgContext } from "./request-context";
export { requireConstituentOrgContext } from "./request-context";
export { listDerivedAgreements } from "./timeline";
export type {
	Constituent,
	ConstituentDuplicateCandidate,
	ConstituentListFilters,
	ConstituentNote,
	ConstituentNoteKind,
	ConstituentRelationship,
	ConstituentType,
	ContactChannel,
	CreateConstituentInput,
	DerivedAgreement,
	RelationshipType,
	UpdateConstituentInput,
} from "./types";
export {
	CONSTITUENT_TYPES,
	isConstituentNoteKind,
	isConstituentType,
	isRelationshipType,
	NOTE_KINDS,
	RELATIONSHIP_TYPES,
} from "./types";
