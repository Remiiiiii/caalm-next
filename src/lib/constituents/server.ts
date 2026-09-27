/**
 * Server-only constituent module surface (Appwrite, audit, cache).
 * API routes and Server Components should import from here — not the root barrel.
 */

import "server-only";

export type { ConstituentActor } from "./audit";
export {
	buildConstituentPiiViewEntry,
	CONSTITUENT_PII_VIEW_ACTION,
	constituentActorFromUser,
	logConstituentAudit,
	logConstituentPiiView,
} from "./audit";
export type {
	CreateConstituentActor,
	CreateConstituentResult,
} from "./create-constituent.service";
export { createConstituentWithDuplicateGate } from "./create-constituent.service";
export type { MergeFieldDiff, MergePreview } from "./merge-types";
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
export {
	canContact,
	CAN_CONTACT_FUTURE_SENDER_PATHS,
	CAN_CONTACT_REQUIRED_SENDER_PATHS,
} from "./consent";
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
