/**
 * Client-safe constituent exports (types, display, consent helpers).
 * Server code must import from `@/lib/constituents/server`.
 */

export {
	CAN_CONTACT_FUTURE_SENDER_PATHS,
	CAN_CONTACT_REQUIRED_SENDER_PATHS,
	canContact,
} from "./consent";
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
export type { MergeFieldDiff, MergePreview } from "./merge-types";
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
