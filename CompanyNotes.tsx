import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { MessageSquare, Send, Trash2, Pencil, X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { DeleteWithReasonDialog } from "./DeleteWithReasonDialog";
import { softDeleteCompanyNote } from "@/hooks/useDeleteEntity";

interface CompanyNote {
  id: string;
  company_id: number;
  user_name: string;
  user_id: string | null;
  note_text: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    full_name: string;
  };
}

interface CompanyNotesProps {
  companyId: number;
}

export const CompanyNotes = ({ companyId }: CompanyNotesProps) => {
  const { user } = useAuth();
  const [notes, setNotes] = useState<CompanyNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  useEffect(() => {
    fetchNotes();
  }, [companyId]);

  const fetchNotes = async () => {
    try {
      const { data, error } = await supabase
        .from("company_notes")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const notesWithProfiles = await Promise.all(
          data.map(async (note) => {
            if (note.user_id) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", note.user_id)
                .single();
              return { ...note, profiles: profile };
            }
            return note;
          })
        );
        setNotes(notesWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching notes:", error);
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async () => {
    if (!newNote.trim()) {
      toast.error("Please enter a note");
      return;
    }

    setIsSubmitting(true);
    try {
      let userName = "Anonymous User";
      let userId = null;

      if (user) {
        // Get user's full name from profiles
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();
        
        userName = profile?.full_name || user.email || "Unknown User";
        userId = user.id;
      }

      const { error } = await supabase.from("company_notes").insert({
        company_id: companyId,
        user_id: userId,
        user_name: userName,
        note_text: newNote.trim(),
      });

      if (error) throw error;

      toast.success("Note added successfully");
      setNewNote("");
      fetchNotes();
    } catch (error) {
      console.error("Error adding note:", error);
      toast.error("Failed to add note");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteNote = async (reason: string) => {
    if (!deleteNoteId) return;
    
    setIsDeletingNote(true);
    try {
      await softDeleteCompanyNote(deleteNoteId, reason);
      toast.success("Note deleted successfully");
      fetchNotes();
    } catch (error) {
      console.error("Error deleting note:", error);
      toast.error("Failed to delete note");
    } finally {
      setIsDeletingNote(false);
      setDeleteNoteId(null);
    }
  };

  const handleEditNote = (note: CompanyNote) => {
    setEditingNoteId(note.id);
    setEditText(note.note_text);
  };

  const handleSaveEdit = async (noteId: string) => {
    if (!editText.trim()) {
      toast.error("Note cannot be empty");
      return;
    }

    try {
      const { error } = await supabase
        .from("company_notes")
        .update({ note_text: editText.trim() })
        .eq("id", noteId);

      if (error) throw error;

      toast.success("Note updated successfully");
      setEditingNoteId(null);
      setEditText("");
      fetchNotes();
    } catch (error) {
      console.error("Error updating note:", error);
      toast.error("Failed to update note");
    }
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageSquare className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Team Notes</h3>
      </div>

      {/* Add Note Form */}
      <Card className="p-4 bg-muted/30">
        <div className="space-y-3">
          <div>
            <Label htmlFor="newNote" className="text-sm">Add a note</Label>
            <Textarea
              id="newNote"
              placeholder="Share insights, updates, or important information about this company..."
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              className="mt-1 min-h-[80px]"
            />
          </div>
          <Button
            onClick={handleAddNote}
            disabled={isSubmitting || !newNote.trim()}
            className="w-full"
          >
            <Send className="h-4 w-4 mr-2" />
            Post Note
          </Button>
        </div>
      </Card>

      {/* Notes List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No notes yet. Be the first to add one!
          </div>
        ) : (
          notes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {getInitials(note.profiles?.full_name || note.user_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-sm">{note.profiles?.full_name || note.user_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(note.created_at), { addSuffix: true })}
                        {note.updated_at !== note.created_at && " (edited)"}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {editingNoteId === note.id ? (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleSaveEdit(note.id)}
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={handleCancelEdit}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            onClick={() => handleEditNote(note)}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => setDeleteNoteId(note.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {editingNoteId === note.id ? (
                    <Textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="mt-2 min-h-[60px]"
                    />
                  ) : (
                    <p className="text-sm mt-2 whitespace-pre-wrap">{note.note_text}</p>
                  )}
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Delete Note Confirmation */}
      <DeleteWithReasonDialog
        entityLabel="Note"
        open={deleteNoteId !== null}
        onOpenChange={(open) => !open && setDeleteNoteId(null)}
        onConfirm={handleDeleteNote}
        isDeleting={isDeletingNote}
      />
    </div>
  );
};