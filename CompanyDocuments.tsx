import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { FileText, Upload, Trash2, Download, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DeleteWithReasonDialog } from "./DeleteWithReasonDialog";
import { softDeleteCompanyDocument } from "@/hooks/useDeleteEntity";

type Document = {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  uploaded_at: string;
};

interface CompanyDocumentsProps {
  companyId: number;
}

export const CompanyDocuments = ({ companyId }: CompanyDocumentsProps) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleteDocId, setDeleteDocId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [companyId]);

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from("company_documents")
        .select("*")
        .eq("company_id", companyId)
        .is("deleted_at", null)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error("Error fetching documents:", error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Only PDF, Word, and Excel files are allowed");
      return;
    }

    // Validate file size (50MB)
    if (file.size > 52428800) {
      toast.error("File size must be less than 50MB");
      return;
    }

    setUploading(true);

    try {
      // Create unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${companyId}/${Date.now()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from("company-documents")
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save document metadata to database
      const { error: dbError } = await supabase
        .from("company_documents")
        .insert({
          company_id: companyId,
          file_name: file.name,
          file_path: fileName,
          file_size: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;

      toast.success("Document uploaded successfully");
      fetchDocuments();
      
      // Reset input
      event.target.value = '';
    } catch (error) {
      console.error("Error uploading document:", error);
      toast.error("Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (document: Document) => {
    try {
      const { data, error } = await supabase.storage
        .from("company-documents")
        .download(document.file_path);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = document.file_name;
      window.document.body.appendChild(a);
      a.click();
      window.document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleDelete = async (reason: string) => {
    if (!deleteDocId) return;
    
    setIsDeleting(true);
    try {
      await softDeleteCompanyDocument(deleteDocId, reason);
      toast.success("Document deleted successfully");
      fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    } finally {
      setIsDeleting(false);
      setDeleteDocId(null);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.includes("pdf")) return "📄";
    if (mimeType.includes("word")) return "📝";
    if (mimeType.includes("sheet") || mimeType.includes("excel")) return "📊";
    return "📎";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Documents
        </h3>
        <div>
          <Input
            type="file"
            id={`file-upload-${companyId}`}
            className="hidden"
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            disabled={uploading}
          />
          <Button
            size="sm"
            onClick={() => window.document.getElementById(`file-upload-${companyId}`)?.click()}
            disabled={uploading}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? "Uploading..." : "Upload"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4 text-muted-foreground">Loading documents...</div>
      ) : documents.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          No documents uploaded yet
        </Card>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl">{getFileIcon(doc.mime_type)}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.file_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {formatFileSize(doc.file_size)} • {new Date(doc.uploaded_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDownload(doc)}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteDocId(doc.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteWithReasonDialog
        entityLabel="Document"
        open={deleteDocId !== null}
        onOpenChange={(open) => !open && setDeleteDocId(null)}
        onConfirm={handleDelete}
        isDeleting={isDeleting}
      />
    </div>
  );
};
