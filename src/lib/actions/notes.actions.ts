"use server";

import { revalidatePath } from "next/cache";
import { ID, Query } from "node-appwrite";
import { appwriteConfig } from "@/lib/appwrite/config";
import { createAdminClient } from "@/lib/appwrite/index";
import { monthDateRange, validateCalendarPin } from "@/lib/notes/calendar-pin";
import { getUserDefaultOrganization } from "@/lib/rbac/permissions";

export interface Note {
	$id: string;
	title: string;
	content: string;
	userId: string;
	orgId: string;
	userName?: string;
	calendarDate?: string | null;
	calendarTime?: string | null;
	$createdAt: string;
	$updatedAt: string;
}

export interface CreateNoteParams {
	title: string;
	content: string;
	userId: string;
	userName?: string;
	calendarDate?: string | null;
	calendarTime?: string | null;
}

export interface UpdateNoteParams {
	noteId: string;
	title?: string;
	content?: string;
	calendarDate?: string | null;
	calendarTime?: string | null;
}

function asNote(doc: unknown): Note {
	return doc as Note;
}

// Create a new note
export async function createNote(params: CreateNoteParams): Promise<Note> {
	try {
		const defaultOrg = await getUserDefaultOrganization(params.userId);
		if (!defaultOrg?.orgId) {
			throw new Error("No organization found for user");
		}

		const pin = validateCalendarPin({
			calendarDate: params.calendarDate,
			calendarTime: params.calendarTime,
		});

		const { databases } = await createAdminClient();

		const payload: Record<string, string> = {
			title: params.title,
			content: params.content,
			userId: params.userId,
			userName: params.userName || "",
			orgId: defaultOrg.orgId,
		};
		if (pin.pinned) {
			payload.calendarDate = pin.calendarDate;
			payload.calendarTime = pin.calendarTime;
		}

		const note = await databases.createDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.notesCollectionId!,
			ID.unique(),
			payload,
		);

		revalidatePath("/dashboard");
		revalidatePath("/calendar");
		return asNote(note);
	} catch (error) {
		console.error("Error creating note:", error);
		throw error;
	}
}

// Get all notes for a user
export async function getUserNotes(userId: string): Promise<Note[]> {
	try {
		const { databases } = await createAdminClient();

		const response = await databases.listDocuments(
			appwriteConfig.databaseId!,
			appwriteConfig.notesCollectionId!,
			[
				Query.equal("userId", userId),
				Query.orderDesc("$updatedAt"),
				Query.limit(100),
			],
		);

		return response.documents as unknown as Note[];
	} catch (error) {
		console.error("Error fetching user notes:", error);
		throw error;
	}
}

/** Notes pinned to a calendar month for one user in one org. */
export async function getCalendarPinnedNotes(
	userId: string,
	orgId: string,
	year: number,
	month: number,
): Promise<Note[]> {
	const { start, end } = monthDateRange(year, month);
	const { databases } = await createAdminClient();

	const response = await databases.listDocuments(
		appwriteConfig.databaseId!,
		appwriteConfig.notesCollectionId!,
		[
			Query.equal("userId", userId),
			Query.equal("orgId", orgId),
			Query.greaterThanEqual("calendarDate", start),
			Query.lessThanEqual("calendarDate", end),
			Query.orderAsc("calendarDate"),
			Query.limit(200),
		],
	);

	const notes = response.documents as unknown as Note[];
	return notes.sort((a, b) => {
		const dateCmp = (a.calendarDate || "").localeCompare(b.calendarDate || "");
		if (dateCmp !== 0) return dateCmp;
		return (a.calendarTime || "").localeCompare(b.calendarTime || "");
	});
}

// Update a note
export async function updateNote(params: UpdateNoteParams): Promise<Note> {
	try {
		const { databases } = await createAdminClient();

		const updateData: Record<string, string | null> = {};
		if (params.title !== undefined) updateData.title = params.title;
		if (params.content !== undefined) updateData.content = params.content;

		if (
			params.calendarDate !== undefined ||
			params.calendarTime !== undefined
		) {
			const pin = validateCalendarPin({
				calendarDate: params.calendarDate,
				calendarTime: params.calendarTime,
			});
			updateData.calendarDate = pin.calendarDate;
			updateData.calendarTime = pin.calendarTime;
		}

		const note = await databases.updateDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.notesCollectionId!,
			params.noteId,
			updateData,
		);

		revalidatePath("/dashboard");
		revalidatePath("/calendar");
		return asNote(note);
	} catch (error) {
		console.error("Error updating note:", error);
		throw error;
	}
}

// Delete a note
export async function deleteNote(noteId: string): Promise<void> {
	try {
		const { databases } = await createAdminClient();

		await databases.deleteDocument(
			appwriteConfig.databaseId!,
			appwriteConfig.notesCollectionId!,
			noteId,
		);

		revalidatePath("/dashboard");
		revalidatePath("/calendar");
	} catch (error) {
		console.error("Error deleting note:", error);
		throw error;
	}
}

// Get notes count for a user
export async function getUserNotesCount(userId: string): Promise<number> {
	try {
		const { databases } = await createAdminClient();

		const response = await databases.listDocuments(
			appwriteConfig.databaseId!,
			appwriteConfig.notesCollectionId!,
			[Query.equal("userId", userId), Query.select(["$id"])],
		);

		return response.total;
	} catch (error) {
		console.error("Error getting notes count:", error);
		return 0;
	}
}
