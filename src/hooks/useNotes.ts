import { useState, useEffect } from 'react';
import {
  createNote,
  getUserNotes,
  updateNote,
  deleteNote,
  Note,
  CreateNoteParams,
  UpdateNoteParams,
} from '@/lib/actions/notes.actions';

interface UseNotesOptions {
  userId: string;
  enableRealTime?: boolean;
  pollingInterval?: number;
}

export const useNotes = ({
  userId,
  enableRealTime = true,
  pollingInterval = 30000,
}: UseNotesOptions) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes from database
  const fetchNotes = async () => {
    try {
      setError(null);
      console.log('useNotes: Fetching notes for userId:', userId);
      const fetchedNotes = await getUserNotes(userId);
      console.log('useNotes: Fetched notes:', fetchedNotes);
      setNotes(fetchedNotes);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch notes';
      setError(errorMessage);
      console.error('Error fetching notes:', err);
      console.error('Error details:', JSON.stringify(err, null, 2));
    } finally {
      setIsLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchNotes();
    }
  }, [userId]);

  // Real-time polling
  useEffect(() => {
    if (!enableRealTime || !userId) return;

    const interval = setInterval(fetchNotes, pollingInterval);
    return () => clearInterval(interval);
  }, [enableRealTime, pollingInterval, userId]);

  // Create note
  const handleCreateNote = async (params: {
    title: string;
    content: string;
  }) => {
    try {
      setError(null);
      const newNote = await createNote({
        ...params,
        userId,
        userName: '', // Will be populated by the action
      });

      // Optimistically update the local state
      setNotes((prev) => [newNote, ...prev]);
      return newNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create note');
      throw err;
    }
  };

  // Update note
  const handleUpdateNote = async (params: UpdateNoteParams) => {
    try {
      setError(null);
      const updatedNote = await updateNote(params);

      // Optimistically update the local state
      setNotes((prev) =>
        prev.map((note) => (note.$id === params.noteId ? updatedNote : note))
      );
      return updatedNote;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update note');
      throw err;
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId: string) => {
    try {
      setError(null);
      await deleteNote(noteId);

      // Optimistically update the local state
      setNotes((prev) => prev.filter((note) => note.$id !== noteId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete note');
      throw err;
    }
  };

  // Refresh notes
  const refresh = () => {
    setIsLoading(true);
    fetchNotes();
  };

  return {
    notes,
    isLoading,
    error,
    createNote: handleCreateNote,
    updateNote: handleUpdateNote,
    deleteNote: handleDeleteNote,
    refresh,
  };
};
