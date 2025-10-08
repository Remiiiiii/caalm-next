'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useNotes } from '@/hooks/useNotes';
import { Note } from '@/lib/actions/notes.actions';
import { useToast } from '@/hooks/use-toast';
import {
  StickyNote,
  Plus,
  Edit,
  Trash2,
  X,
  Save,
  Calendar,
  AlertTriangle,
  MoreVertical,
  Image,
  List,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
// VisuallyHidden component for accessibility
const VisuallyHidden = ({
  children,
  ...props
}: {
  children: React.ReactNode;
  asChild?: boolean;
}) => (
  <span className="sr-only" {...props}>
    {children}
  </span>
);
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface QuickNotesWidgetProps {
  userId?: string;
  user?: {
    $id: string;
    name?: string;
    [key: string]: any;
  };
}

const QuickNotesWidget: React.FC<QuickNotesWidgetProps> = ({
  userId,
  user,
}) => {
  const { toast } = useToast();
  const {
    notes,
    isLoading: loading,
    error,
    createNote,
    updateNote,
    deleteNote,
  } = useNotes({
    userId: userId || user?.$id || 'default',
    enableRealTime: true,
    pollingInterval: 30000,
  });

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);

  // Form state
  const [newNote, setNewNote] = useState({ title: '', content: '' });
  const [editNote, setEditNote] = useState({ title: '', content: '' });
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const handleCreateNote = async () => {
    if (!newNote.title.trim() || !newNote.content.trim()) return;

    try {
      await createNote({
        title: newNote.title.trim(),
        content: newNote.content.trim(),
      });

      setNewNote({ title: '', content: '' });
      setIsCreateDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Note created successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to create note',
        variant: 'destructive',
      });
    }
  };

  const handleEditNote = async () => {
    if (!selectedNote || !editNote.title.trim() || !editNote.content.trim())
      return;

    try {
      await updateNote({
        noteId: selectedNote.$id,
        title: editNote.title.trim(),
        content: editNote.content.trim(),
      });

      setSelectedNote(null);
      setEditNote({ title: '', content: '' });
      setIsEditDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Note updated successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to update note',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteNote = async () => {
    if (!selectedNote) return;

    try {
      await deleteNote(selectedNote.$id);
      setSelectedNote(null);
      setIsDeleteDialogOpen(false);

      toast({
        title: 'Success',
        description: 'Note deleted successfully',
      });
    } catch (err) {
      toast({
        title: 'Error',
        description: 'Failed to delete note',
        variant: 'destructive',
      });
    }
  };

  const openEditDialog = (note: Note) => {
    setSelectedNote(note);
    setEditNote({ title: note.title, content: note.content });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (note: Note) => {
    setSelectedNote(note);
    setIsDeleteDialogOpen(true);
  };

  // Image upload handler
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Toolbar functions
  const insertBulletPoint = () => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const newText = before + '• ' + after;

      if (textarea.id === 'newNoteContent') {
        setNewNote((prev) => ({ ...prev, content: newText }));
      } else {
        setEditNote((prev) => ({ ...prev, content: newText }));
      }

      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  const toggleBold = () => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = `**${selectedText}**`;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const finalText = before + newText + after;

      if (textarea.id === 'newNoteContent') {
        setNewNote((prev) => ({ ...prev, content: finalText }));
      } else {
        setEditNote((prev) => ({ ...prev, content: finalText }));
      }
    }
  };

  const toggleItalic = () => {
    const textarea = document.activeElement as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selectedText = textarea.value.substring(start, end);
      const newText = `*${selectedText}*`;
      const text = textarea.value;
      const before = text.substring(0, start);
      const after = text.substring(end);
      const finalText = before + newText + after;

      if (textarea.id === 'newNoteContent') {
        setNewNote((prev) => ({ ...prev, content: finalText }));
      } else {
        setEditNote((prev) => ({ ...prev, content: finalText }));
      }
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const truncateContent = (content: string, maxWords: number = 25) => {
    const words = content.split(' ');
    if (words.length <= maxWords) return content;
    return words.slice(0, maxWords).join(' ') + '...';
  };

  // Sort notes by updated date (most recent first)
  const sortedNotes = [...notes].sort(
    (a, b) =>
      new Date(b.$updatedAt).getTime() - new Date(a.$updatedAt).getTime()
  );

  if (loading) {
    return (
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <StickyNote className="h-4 w-4 text-slate-600" />
            <CardTitle className="text-sm font-semibold sidebar-gradient-text">
              Quick Notes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-2 flex items-center justify-center h-full">
          <div className="text-sm text-slate-500">Loading notes...</div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        <CardHeader className="pb-3 pt-4 px-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <CardTitle className="text-sm font-semibold sidebar-gradient-text">
              Quick Notes
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-4 pb-2 flex flex-col items-center justify-center h-full">
          <div className="text-sm text-red-500 text-center mb-2">
            Failed to load notes
          </div>
          <div className="text-xs text-slate-500 text-center">{error}</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="w-[320px] h-[290px] bg-gradient-to-br from-white/40 to-white/20 backdrop-blur-md border border-white/30 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden">
        {/* Header */}
        <CardHeader className="pb-1 pt-4 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <StickyNote className="h-4 w-4 text-slate-600" />
              <CardTitle className="text-sm font-semibold sidebar-gradient-text">
                Quick Notes
              </CardTitle>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsCreateDialogOpen(true)}
              className="h-6 w-6 p-0 hover:bg-white/40"
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-2">
          {error ? (
            <div className="text-sm text-red-500 text-center py-4">{error}</div>
          ) : notes.length === 0 ? (
            <div className="text-center py-8">
              <StickyNote className="h-8 w-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm text-slate-500 mb-3">No notes yet</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(true)}
                className="text-xs"
              >
                Create your first note
              </Button>
            </div>
          ) : (
            <div className="space-y-2 max-h-[220px] overflow-y-auto scrollbar-hide">
              {sortedNotes.map((note, index) => (
                <div key={note.$id}>
                  <div
                    className="bg-white/20 rounded-lg p-2 cursor-pointer hover:bg-white/30 transition-colors border border-white/20 backdrop-blur-sm"
                    onClick={() => openEditDialog(note)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-44">
                        <div className="flex items-center gap-1 mt-1">
                          <Calendar className="h-3 w-3 text-slate-400" />
                          <span className="text-xs text-slate-400">
                            {formatDate(note.$updatedAt)}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {new Date(note.$updatedAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <h4 className="py-1 font-medium text-sm sidebar-gradient-text truncate">
                          {note.title}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                          {truncateContent(note.content)}
                        </p>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(note);
                          }}
                          className="h-5 w-5 p-0 hover:bg-white/60"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDeleteDialog(note);
                          }}
                          className="h-5 w-5 p-0 hover:bg-red-100 hover:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                  {/* Separator line between notes (only if multiple notes and not the last one) */}
                  {sortedNotes.length > 1 && index < sortedNotes.length - 1 && (
                    <div className="h-px bg-slate-300 my-2"></div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Note Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-2xl rounded-lg max-w-md mx-4 p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Create New Note</DialogTitle>
          </VisuallyHidden>
          {/* Header Bar */}
          <div className="bg-yellow-100/80 border-b border-yellow-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                New Note
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsCreateDialogOpen(false)}
                className="h-6 w-6 p-0 hover:bg-yellow-200/60"
              >
                <X className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-yellow-50/80 p-4 min-h-[200px]">
            <div className="space-y-3">
              <Input
                value={newNote.title}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Title"
                className="bg-transparent border-b border-slate-300 shadow-none text-base font-medium placeholder:text-slate-400 focus-visible:ring-0 p-0"
              />
              <Textarea
                id="newNoteContent"
                value={newNote.content}
                onChange={(e) =>
                  setNewNote((prev) => ({ ...prev, content: e.target.value }))
                }
                placeholder="Take a note..."
                className="bg-transparent border-0 shadow-none text-sm placeholder:text-slate-400 focus-visible:ring-0 p-0 min-h-[120px] resize-none"
              />
              {imagePreview && (
                <div className="mt-3">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="max-w-full h-32 object-cover rounded"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImagePreview(null);
                      setImageFile(null);
                    }}
                    className="text-red-500 hover:text-red-700 mt-2"
                  >
                    Remove Image
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Footer Toolbar */}
          <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBold}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Bold"
              >
                <span className="text-xs font-bold">B</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleItalic}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Italic"
              >
                <span className="text-xs italic">I</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Underline"
              >
                <span className="text-xs underline">U</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Strikethrough"
              >
                <span className="text-xs line-through">ab</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertBulletPoint}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Bullet Point"
              >
                <List className="h-3 w-3" />
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                  title="Upload Image"
                  asChild
                >
                  <span>
                    <Image className="h-3 w-3" />
                  </span>
                </Button>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsCreateDialogOpen(false)}
                className="text-xs px-3 primary-btn"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateNote}
                disabled={!newNote.content.trim()}
                className="primary-btn text-xs px-3 py-1 h-7"
              >
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Note Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-2xl rounded-lg max-w-md mx-4 p-0 overflow-hidden">
          <VisuallyHidden>
            <DialogTitle>Edit Note</DialogTitle>
          </VisuallyHidden>
          {/* Header Bar */}
          <div className="bg-yellow-100/80 border-b border-yellow-200 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Edit className="h-4 w-4 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">
                Edit Note
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditDialogOpen(false)}
                className="h-6 w-6 p-0 hover:bg-yellow-200/60"
              >
                <X className="h-4 w-4 text-slate-600" />
              </Button>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="bg-yellow-50/80 p-4 min-h-[200px]">
            <div className="space-y-3">
              <Input
                value={editNote.title}
                onChange={(e) =>
                  setEditNote((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Title"
                className="bg-transparent border-b border-slate-300 shadow-none text-base font-medium placeholder:text-slate-400 focus-visible:ring-0 p-0"
              />
              <Textarea
                id="editNoteContent"
                value={editNote.content}
                onChange={(e) =>
                  setEditNote((prev) => ({
                    ...prev,
                    content: e.target.value,
                  }))
                }
                placeholder="Take a note..."
                className="bg-transparent border-0 shadow-none text-sm placeholder:text-slate-400 focus-visible:ring-0 p-0 min-h-[120px] resize-none"
              />
              {selectedNote?.imageUrl && (
                <div className="mt-3">
                  <img
                    src={selectedNote.imageUrl}
                    alt="Note attachment"
                    className="max-w-full h-32 object-cover rounded"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Footer Toolbar */}
          <div className="bg-slate-50/80 border-t border-slate-200 px-4 py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleBold}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Bold"
              >
                <span className="text-xs font-bold">B</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleItalic}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Italic"
              >
                <span className="text-xs italic">I</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Underline"
              >
                <span className="text-xs underline">U</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Strikethrough"
              >
                <span className="text-xs line-through">ab</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={insertBulletPoint}
                className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                title="Bullet Point"
              >
                <List className="h-3 w-3" />
              </Button>
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                  title="Upload Image"
                  asChild
                >
                  <span>
                    <Image className="h-3 w-3" />
                  </span>
                </Button>
              </label>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditDialogOpen(false)}
                className="text-xs px-3 primary-btn"
              >
                Cancel
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                    title="More Options"
                  >
                    <MoreVertical className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => openDeleteDialog(selectedNote!)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 focus:text-red-700 focus:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Note
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                onClick={handleEditNote}
                disabled={!editNote.content.trim()}
                className="primary-btn text-xs px-3 py-1 h-7"
              >
                <Save className="h-3 w-3 mr-1" />
                Update
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-2xl rounded-lg max-w-md mx-4">
          <AlertDialogHeader className="pb-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-lg font-semibold sidebar-gradient-text">
                  Delete Note?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-sm text-slate-600 mt-1">
                  This action cannot be undone
                </AlertDialogDescription>
              </div>
            </div>
          </AlertDialogHeader>

          <div className="px-6 pb-6">
            <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
              <h4 className="text-sm font-medium text-slate-900 mb-3">
                Note Details
              </h4>
              <div className="space-y-2">
                {selectedNote?.title && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-sm text-slate-600">Title:</span>
                    <span className="text-sm font-medium text-slate-900 truncate max-w-[200px]">
                      {selectedNote.title}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-slate-600">Created:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {selectedNote?.$createdAt &&
                      new Date(selectedNote.$createdAt).toLocaleDateString(
                        'en-US',
                        {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        }
                      )}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-2">
                <div className="w-4 h-4 bg-amber-400 rounded-full flex items-center justify-center mt-0.5">
                  <span className="text-xs text-white font-bold">!</span>
                </div>
                <p className="text-sm text-amber-800">
                  <strong>Warning:</strong> This will permanently remove the
                  note from your collection.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-center items-center gap-3 px-6 pb-6 pt-4">
            <AlertDialogCancel className="primary-btn">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteNote}
              className="primary-btn"
            >
              Delete Note
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Custom scrollbar styles */}
      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </>
  );
};

export default QuickNotesWidget;
