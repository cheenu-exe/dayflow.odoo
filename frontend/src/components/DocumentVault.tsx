import { useState } from "react";
import { Download, Eye, FileCheck, FileText, Plus, Trash2, UploadCloud, X } from "lucide-react";
import { toast } from "sonner";

export type DocItem = {
  id: string;
  name: string;
  category: "Contract" | "Identification" | "Tax" | "Education" | "Offer Letter";
  uploadedDate: string;
  size: string;
  verified: boolean;
};

const DEFAULT_DOCS: DocItem[] = [
  {
    id: "doc-1",
    name: "Employment_Agreement_2026.pdf",
    category: "Contract",
    uploadedDate: "2026-01-15",
    size: "1.4 MB",
    verified: true,
  },
  {
    id: "doc-2",
    name: "Government_ID_Verification.pdf",
    category: "Identification",
    uploadedDate: "2026-01-16",
    size: "820 KB",
    verified: true,
  },
  {
    id: "doc-3",
    name: "Form_W4_Tax_Declaration_2026.pdf",
    category: "Tax",
    uploadedDate: "2026-02-01",
    size: "450 KB",
    verified: true,
  },
];

export function DocumentVault({ employeeName }: { employeeName?: string }) {
  const [docs, setDocs] = useState<DocItem[]>(DEFAULT_DOCS);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [docName, setDocName] = useState("");
  const [docCategory, setDocCategory] = useState<DocItem["category"]>("Contract");
  const [fileName, setFileName] = useState("");

  function handleUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!docName) return;

    const newDoc: DocItem = {
      id: `doc-${Date.now()}`,
      name: docName.endsWith(".pdf") ? docName : `${docName}.pdf`,
      category: docCategory,
      uploadedDate: new Date().toISOString().split("T")[0],
      size: `${(Math.random() * 1.5 + 0.3).toFixed(1)} MB`,
      verified: true,
    };

    setDocs((prev) => [newDoc, ...prev]);
    setShowUploadModal(false);
    setDocName("");
    setFileName("");
    toast.success("Document uploaded to vault!", {
      description: `${newDoc.name} stored in secure employee file.`,
    });
  }

  function handleDelete(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
    toast.info("Document removed from vault.");
  }

  function handleDownload(doc: DocItem) {
    toast.success(`Downloading ${doc.name}`, { description: "Verified document payload delivered." });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-display text-base font-bold text-ink">Employee Document Vault</h4>
          <p className="text-[11px] text-ink/50">Verified legal contracts, tax forms, and credentials.</p>
        </div>
        <button
          type="button"
          onClick={() => setShowUploadModal(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#0b6b57] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e]"
        >
          <Plus className="h-3.5 w-3.5" /> Upload File
        </button>
      </div>

      <div className="divide-y divide-ink/8 rounded-2xl border border-ink/10 bg-white overflow-hidden shadow-xs">
        {docs.map((doc) => (
          <div key={doc.id} className="flex items-center justify-between p-3.5 px-4 hover:bg-[#f7f5ef]/50">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0b6b57]/10 text-[#0b6b57]">
                <FileText className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-ink">{doc.name}</p>
                <p className="text-[10px] text-ink/45">
                  {doc.category} · {doc.size} · Uploaded {doc.uploadedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownload(doc)}
                className="rounded-full p-1.5 text-ink/50 hover:bg-ink/5 hover:text-ink"
                title="Download"
              >
                <Download className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => handleDelete(doc.id)}
                className="rounded-full p-1.5 text-ink/40 hover:bg-red-50 hover:text-red-600"
                title="Delete"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-[28px] border border-ink/10 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-ink/8 pb-3">
              <h3 className="font-display text-lg font-bold">Upload Employee Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-ink/40 hover:text-ink">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleUpload} className="mt-4 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-ink/60">Document Title</label>
                <input
                  type="text"
                  required
                  value={docName}
                  onChange={(e) => setDocName(e.target.value)}
                  placeholder="e.g. Passport_Scan, Offer_Letter"
                  className="mt-1 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:border-[#0b6b57] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-ink/60">Category</label>
                <select
                  value={docCategory}
                  onChange={(e) => setDocCategory(e.target.value as any)}
                  className="mt-1 w-full rounded-xl border border-ink/15 p-2.5 text-xs text-ink focus:outline-none"
                >
                  <option value="Contract">Contract & Employment Agreement</option>
                  <option value="Identification">Government Identification</option>
                  <option value="Tax">Tax & W-4 / Form 16</option>
                  <option value="Education">Educational Degrees / Certifications</option>
                  <option value="Offer Letter">Offer Letter</option>
                </select>
              </div>

              <div className="rounded-2xl border-2 border-dashed border-ink/15 p-6 text-center">
                <UploadCloud className="mx-auto h-8 w-8 text-[#0b6b57]" />
                <p className="mt-2 text-xs font-bold text-ink">Choose a PDF or image file</p>
                <p className="text-[10px] text-ink/40">Supported: PDF, PNG, JPEG up to 10MB</p>
                <input
                  type="file"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setFileName(e.target.files[0].name);
                      if (!docName) setDocName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                    }
                  }}
                  className="mt-3 text-xs text-ink/60"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 rounded-full border border-ink/15 py-2 text-xs font-bold text-ink/70"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-[#0b6b57] py-2 text-xs font-bold text-white shadow-xs hover:bg-[#084d3e]"
                >
                  Confirm Upload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
