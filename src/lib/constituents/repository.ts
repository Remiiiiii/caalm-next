import { ID, Query } from "node-appwrite";
import { createAdminClient } from "@/lib/appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import {
	matchesDuplicateSignals,
	normalizeEmail,
	normalizeFirstName,
	normalizeLastName,
} from "./duplicates";
import type {
	Constituent,
	ConstituentListFilters,
	ConstituentType,
	CreateConstituentInput,
	UpdateConstituentInput,
} from "./types";
import { isConstituentType } from "./types";

const PAGE_SIZE_MAX = 100;

function tableId(): string {
	return appwriteConfig.constituentsCollectionId || "69c8d4f100a8c4d1e2f0";
}

function dbId(): string {
	return appwriteConfig.databaseId || "";
}

function optionalString(value: unknown): string | undefined {
	if (typeof value !== "string") return undefined;
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function mapRow(row: Record<string, unknown>): Constituent {
	const type = isConstituentType(row.type) ? row.type : "other";
	return {
		$id: String(row.$id),
		$createdAt: String(row.$createdAt || ""),
		$updatedAt: String(row.$updatedAt || ""),
		orgId: String(row.orgId || ""),
		type,
		firstName: String(row.firstName || ""),
		lastName: String(row.lastName || ""),
		email: optionalString(row.email),
		phone: optionalString(row.phone),
		addressLine1: optionalString(row.addressLine1),
		city: optionalString(row.city),
		region: optionalString(row.region),
		postalCode: optionalString(row.postalCode),
		country: optionalString(row.country),
		doNotContact: Boolean(row.doNotContact),
		piiAccessedAt: optionalString(row.piiAccessedAt),
		normalizedEmail: optionalString(row.normalizedEmail),
		normalizedLastName: optionalString(row.normalizedLastName),
		mergedIntoId: optionalString(row.mergedIntoId),
	};
}

function stampNormalized(input: {
	firstName?: string;
	lastName?: string;
	email?: string;
}): { normalizedEmail?: string; normalizedLastName?: string } {
	const next: { normalizedEmail?: string; normalizedLastName?: string } = {};
	if (input.email !== undefined) {
		const email = normalizeEmail(input.email);
		if (email) next.normalizedEmail = email;
	}
	if (input.lastName !== undefined) {
		const lastName = normalizeLastName(input.lastName);
		if (lastName) next.normalizedLastName = lastName;
	}
	return next;
}

export async function listConstituents(
	filters: ConstituentListFilters,
): Promise<{ items: Constituent[]; total: number }> {
	const { tablesDB } = await createAdminClient();
	const limit = Math.min(filters.limit ?? 20, PAGE_SIZE_MAX);
	const offset = Math.max(filters.offset ?? 0, 0);
	const queries = [
		Query.equal("orgId", filters.orgId),
		Query.orderDesc("$createdAt"),
		Query.limit(limit),
		Query.offset(offset),
	];
	if (filters.type) queries.push(Query.equal("type", filters.type));
	if (filters.city) queries.push(Query.equal("city", filters.city));
	if (filters.doNotContact != null) {
		queries.push(Query.equal("doNotContact", filters.doNotContact));
	}
	const search = filters.search?.trim();
	if (search) {
		queries.push(
			Query.or([
				Query.contains("firstName", search),
				Query.contains("lastName", search),
				Query.contains("email", search),
				Query.contains("normalizedEmail", normalizeEmail(search)),
			]),
		);
	}

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries,
	});
	const items = (result.rows as unknown as Record<string, unknown>[])
		.map(mapRow)
		.filter((row) => !row.mergedIntoId);
	return {
		items,
		total: result.total ?? items.length,
	};
}

export async function getConstituentById(
	id: string,
): Promise<Constituent | null> {
	try {
		const { tablesDB } = await createAdminClient();
		const row = await tablesDB.getRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
		});
		return mapRow(row as unknown as Record<string, unknown>);
	} catch {
		return null;
	}
}

export async function markPiiAccessed(id: string): Promise<void> {
	try {
		const { tablesDB } = await createAdminClient();
		await tablesDB.updateRow({
			databaseId: dbId(),
			tableId: tableId(),
			rowId: id,
			data: { piiAccessedAt: new Date().toISOString() },
		});
	} catch {
		// List/detail still works if the timestamp write fails.
	}
}

export async function findDuplicateConstituents(input: {
	orgId: string;
	firstName: string;
	lastName: string;
	email?: string;
}): Promise<Constituent[]> {
	const { tablesDB } = await createAdminClient();
	const normalizedEmail = normalizeEmail(input.email);
	const normalizedLastName = normalizeLastName(input.lastName);
	const normalizedFirstName = normalizeFirstName(input.firstName);
	const orFilters = [];
	if (normalizedEmail) {
		orFilters.push(Query.equal("normalizedEmail", normalizedEmail));
	}
	if (normalizedLastName) {
		orFilters.push(Query.equal("normalizedLastName", normalizedLastName));
	}
	if (orFilters.length === 0) return [];

	const result = await tablesDB.listRows({
		databaseId: dbId(),
		tableId: tableId(),
		queries: [
			Query.equal("orgId", input.orgId),
			orFilters.length === 1 ? orFilters[0] : Query.or(orFilters),
			Query.limit(25),
		],
	});
	return (result.rows as unknown as Record<string, unknown>[])
		.map(mapRow)
		.filter((row) =>
			matchesDuplicateSignals(
				{ normalizedEmail, normalizedFirstName, normalizedLastName },
				{
					normalizedEmail: row.normalizedEmail,
					firstName: row.firstName,
					normalizedLastName: row.normalizedLastName,
				},
			),
		);
}

function writePayload(input: CreateConstituentInput): Record<string, unknown> {
	const data: Record<string, unknown> = {
		orgId: input.orgId,
		type: input.type,
		firstName: input.firstName.slice(0, 128),
		lastName: input.lastName.slice(0, 128),
		doNotContact: Boolean(input.doNotContact),
		...stampNormalized(input),
	};
	if (input.email) data.email = input.email.slice(0, 256);
	if (input.phone) data.phone = input.phone.slice(0, 32);
	if (input.addressLine1) data.addressLine1 = input.addressLine1.slice(0, 256);
	if (input.city) data.city = input.city.slice(0, 128);
	if (input.region) data.region = input.region.slice(0, 128);
	if (input.postalCode) data.postalCode = input.postalCode.slice(0, 32);
	if (input.country) data.country = input.country.slice(0, 128);
	return data;
}

export async function createConstituent(
	input: CreateConstituentInput,
): Promise<Constituent> {
	const { tablesDB } = await createAdminClient();
	const row = await tablesDB.createRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: ID.unique(),
		data: writePayload(input),
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function updateConstituent(
	id: string,
	patch: UpdateConstituentInput,
): Promise<Constituent> {
	const { tablesDB } = await createAdminClient();
	const data: Record<string, unknown> = {};
	if (patch.type) data.type = patch.type;
	if (patch.firstName != null) data.firstName = patch.firstName.slice(0, 128);
	if (patch.lastName != null) data.lastName = patch.lastName.slice(0, 128);
	if (patch.email != null) data.email = patch.email.slice(0, 256);
	if (patch.phone != null) data.phone = patch.phone.slice(0, 32);
	if (patch.addressLine1 != null) {
		data.addressLine1 = patch.addressLine1.slice(0, 256);
	}
	if (patch.city != null) data.city = patch.city.slice(0, 128);
	if (patch.region != null) data.region = patch.region.slice(0, 128);
	if (patch.postalCode != null) data.postalCode = patch.postalCode.slice(0, 32);
	if (patch.country != null) data.country = patch.country.slice(0, 128);
	if (patch.doNotContact != null) data.doNotContact = patch.doNotContact;
	if (patch.mergedIntoId != null) data.mergedIntoId = patch.mergedIntoId;
	Object.assign(data, stampNormalized(patch));
	const row = await tablesDB.updateRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
		data,
	});
	return mapRow(row as unknown as Record<string, unknown>);
}

export async function deleteConstituent(id: string): Promise<void> {
	const { tablesDB } = await createAdminClient();
	await tablesDB.deleteRow({
		databaseId: dbId(),
		tableId: tableId(),
		rowId: id,
	});
}

export function parseTypeParam(
	value: string | null,
): ConstituentType | undefined {
	return isConstituentType(value) ? value : undefined;
}

export function parseDoNotContactParam(
	value: string | null,
): boolean | undefined {
	if (value === "true") return true;
	if (value === "false") return false;
	return undefined;
}
