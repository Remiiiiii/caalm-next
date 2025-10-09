'use server';

import { ID, Query } from 'node-appwrite';
import { createAdminClient } from '@/lib/appwrite/index';
import { appwriteConfig } from '@/lib/appwrite/config';
import { revalidatePath } from 'next/cache';

export interface Note {
  $id: string;
  title: string;
  content: string;
  userId: string;
  userName?: string;
  $createdAt: string;
  $updatedAt: string;
}

export interface CreateNoteParams {
  title: string;
  content: string;
  userId: string;
  userName?: string;
}

export interface UpdateNoteParams {
  noteId: string;
  title?: string;
  content?: string;
}

// Create a new note
export async function createNote(params: CreateNoteParams): Promise<Note> {
  try {
    const { databases } = await createAdminClient();

    const note = await databases.createDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.notesCollectionId!,
      ID.unique(),
      {
        title: params.title,
        content: params.content,
        userId: params.userId,
        userName: params.userName || '',
      }
    );

    revalidatePath('/dashboard');
    return note as Note;
  } catch (error) {
    console.error('Error creating note:', error);
    throw error;
  }
}

// Get all notes for a user
export async function getUserNotes(userId: string): Promise<Note[]> {
  try {
    console.log('getUserNotes: Starting with userId:', userId);
    console.log('getUserNotes: Database ID:', appwriteConfig.databaseId);
    console.log(
      'getUserNotes: Collection ID:',
      appwriteConfig.notesCollectionId
    );

    const { databases } = await createAdminClient();

    const response = await databases.listDocuments(
      appwriteConfig.databaseId!,
      appwriteConfig.notesCollectionId!,
      [
        Query.equal('userId', userId),
        Query.orderDesc('$updatedAt'),
        Query.limit(100),
      ]
    );

    console.log('getUserNotes: Response:', response);
    return response.documents as Note[];
  } catch (error) {
    console.error('Error fetching user notes:', error);
    // Throw the actual error instead of a generic one for debugging
    throw error;
  }
}

// Update a note
export async function updateNote(params: UpdateNoteParams): Promise<Note> {
  try {
    const { databases } = await createAdminClient();

    const updateData: Record<string, any> = {};
    if (params.title !== undefined) updateData.title = params.title;
    if (params.content !== undefined) updateData.content = params.content;

    const note = await databases.updateDocument(
      appwriteConfig.databaseId!,
      appwriteConfig.notesCollectionId!,
      params.noteId,
      updateData
    );

    revalidatePath('/dashboard');
    return note as Note;
  } catch (error) {
    console.error('Error updating note:', error);
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
      noteId
    );

    revalidatePath('/dashboard');
  } catch (error) {
    console.error('Error deleting note:', error);
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
      [Query.equal('userId', userId), Query.select(['$id'])]
    );

    return response.total;
  } catch (error) {
    console.error('Error getting notes count:', error);
    return 0;
  }
}
