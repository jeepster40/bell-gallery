import { useState, useRef, useCallback } from "react";
import { Upload, Camera, Film, CheckCircle2, X, Heart, ImagePlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface FilePreview {
  file: File;
  url: string;
  type: "image" | "video";
}

type UploadStatus = "idle" | "uploading" | "done" | "error";

export default function UploadPage() {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [uploadedCount, setUploadedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const addFiles = useCallback((incoming: File[]) => {
    const allowed = incoming.filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (allowed.length !== incoming.length) {
      toast({ title: "Some files skipped", description: "Only images and videos are supported.", variant: "destructive" });
    }
    const previews: FilePreview[] = allowed.map((f) => ({
      file: f,
      url: URL.createObjectURL(f),
      type: f.type.startsWith("video/") ? "video" : "image",
    }));
    setFiles((prev) => [...prev, ...previews]);
  }, [toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const removeFile = (idx: number) => {
    setFiles((prev) => {
      URL.revokeObjectURL(prev[idx].url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (files.length === 0) {
      toast({ title: "No files selected", description: "Please choose at least one photo or video.", variant: "destructive" });
      return;
    }
    setStatus("uploading");
    setProgress(10);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append("files", f.file));
      if (name.trim()) fd.append("name", name.trim());
      if (caption.trim()) fd.append("caption", caption.trim());

      // Simulate incremental progress
      const prog = setInterval(() => setProgress((p) => Math.min(p + 8, 85)), 300);

      const res = await apiRequest("POST", "/api/upload", fd);
      clearInterval(prog);
      setProgress(100);

      const data = await res.json();
      setUploadedCount(data.count);
      setStatus("done");
      files.forEach((f) => URL.revokeObjectURL(f.url));
    } catch (err: any) {
      setStatus("error");
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    }
  };

  const reset = () => {
    setFiles([]);
    setName("");
    setCaption("");
    setStatus("idle");
    setProgress(0);
    setUploadedCount(0);
  };

  if (status === "done") {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-8) var(--space-6)" }}>
        <div style={{ textAlign: "center", maxWidth: "480px" }}>
          {/* Animated success heart */}
          <div style={{ fontSize: "72px", marginBottom: "var(--space-6)", animation: "float 3s ease-in-out infinite" }}>
            💕
          </div>
          <h1 style={{
            fontFamily: "var(--font-display)",
            fontSize: "var(--text-2xl)",
            fontWeight: 400,
            color: "var(--color-text)",
            marginBottom: "var(--space-3)",
            letterSpacing: "0.02em",
          }}>
            Thank you!
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-base)", marginBottom: "var(--space-2)" }}>
            {uploadedCount} {uploadedCount === 1 ? "photo/video" : "photos/videos"} shared with Brent & Jasmine.
          </p>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-8)" }}>
            Your memories have been added to their celebration gallery.
          </p>
          <div style={{ display: "flex", gap: "var(--space-3)", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={reset}
              data-testid="btn-upload-more"
              style={{
                padding: "0.625rem 1.5rem",
                borderRadius: "var(--radius-full)",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              Upload more
            </button>
            <a
              href="/#/gallery"
              style={{
                padding: "0.625rem 1.5rem",
                borderRadius: "var(--radius-full)",
                border: "1px solid var(--color-border)",
                color: "var(--color-text)",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-sm)",
                fontWeight: 500,
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.375rem",
              }}
            >
              View Gallery
            </a>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "680px", margin: "0 auto", padding: "var(--space-10) var(--space-6) var(--space-16)" }}>
      {/* Hero header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-10)" }}>
        <div style={{ fontSize: "48px", marginBottom: "var(--space-4)" }}>💍</div>
        <h1 style={{
          fontFamily: "var(--font-display)",
          fontSize: "var(--text-3xl)",
          fontWeight: 400,
          color: "var(--color-text)",
          letterSpacing: "0.02em",
          lineHeight: 1.1,
          marginBottom: "var(--space-3)",
        }}>
          Congratulations<br />
          <em style={{ fontStyle: "italic", color: "var(--color-primary)" }}>Brent & Jasmine Bell</em>
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-base)", maxWidth: "420px", margin: "0 auto" }}>
          Share your photos and videos from their celebration. No app needed — just pick your files and upload.
        </p>
      </div>

      {/* File drop zone */}
      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        data-testid="drop-zone"
        style={{
          padding: "var(--space-12) var(--space-8)",
          textAlign: "center",
          background: dragOver ? "rgba(192,80,112,0.04)" : "var(--color-surface)",
          marginBottom: "var(--space-6)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", gap: "var(--space-4)", marginBottom: "var(--space-4)" }}>
          <Camera size={32} style={{ color: "var(--color-primary)" }} />
          <Film size={32} style={{ color: "var(--color-gold)" }} />
        </div>
        <p style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 400, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          Drop photos & videos here
        </p>
        <p style={{ fontSize: "var(--text-sm)", color: "var(--color-text-muted)", marginBottom: "var(--space-4)" }}>
          or tap to browse your camera roll
        </p>
        <div style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "var(--space-2)",
          padding: "0.5rem 1.25rem",
          borderRadius: "var(--radius-full)",
          background: "var(--color-primary)",
          color: "#fff",
          fontSize: "var(--text-sm)",
          fontWeight: 500,
          pointerEvents: "none",
        }}>
          <ImagePlus size={16} />
          Choose files
        </div>
        <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-4)" }}>
          JPG, PNG, HEIC, GIF, MP4, MOV · Up to 100MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          style={{ display: "none" }}
          onChange={(e) => e.target.files && addFiles(Array.from(e.target.files))}
          data-testid="file-input"
        />
      </div>

      {/* Preview grid */}
      {files.length > 0 && (
        <div style={{ marginBottom: "var(--space-6)" }}>
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "var(--space-2)",
            marginBottom: "var(--space-4)",
          }}>
            {files.map((f, i) => (
              <div key={i} data-testid={`preview-item-${i}`} style={{ position: "relative", aspectRatio: "1", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--color-surface)" }}>
                {f.type === "image" ? (
                  <img src={f.url} alt={f.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--color-surface-2)" }}>
                    <Film size={24} style={{ color: "var(--color-text-muted)" }} />
                  </div>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(i); }}
                  data-testid={`remove-file-${i}`}
                  style={{
                    position: "absolute", top: "4px", right: "4px",
                    width: "20px", height: "20px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    border: "none", cursor: "pointer",
                  }}
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
            {files.length} {files.length === 1 ? "file" : "files"} ready to upload
          </p>
        </div>
      )}

      {/* Optional fields */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Your name <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>(optional)</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aunt Sarah"
            data-testid="input-name"
            style={{
              width: "100%",
              padding: "0.625rem 0.875rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
            }}
          />
        </div>
        <div>
          <label style={{ display: "block", fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Caption <span style={{ color: "var(--color-text-faint)", fontWeight: 400 }}>(optional)</span>
          </label>
          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="A sweet note or memory to share…"
            rows={2}
            data-testid="input-caption"
            style={{
              width: "100%",
              padding: "0.625rem 0.875rem",
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-md)",
              background: "var(--color-surface)",
              color: "var(--color-text)",
              fontSize: "var(--text-base)",
              fontFamily: "var(--font-body)",
              resize: "vertical",
              lineHeight: 1.5,
            }}
          />
        </div>
      </div>

      {/* Progress bar */}
      {status === "uploading" && (
        <div style={{ marginBottom: "var(--space-4)" }}>
          <div className="upload-progress-bar">
            <div className="upload-progress-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginTop: "var(--space-2)", textAlign: "center" }}>
            Uploading… {progress}%
          </p>
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={status === "uploading" || files.length === 0}
        data-testid="btn-submit"
        style={{
          width: "100%",
          padding: "0.875rem",
          borderRadius: "var(--radius-full)",
          background: files.length > 0 && status !== "uploading" ? "var(--color-primary)" : "var(--color-border)",
          color: files.length > 0 && status !== "uploading" ? "#fff" : "var(--color-text-faint)",
          fontSize: "var(--text-base)",
          fontFamily: "var(--font-body)",
          fontWeight: 600,
          border: "none",
          cursor: files.length > 0 && status !== "uploading" ? "pointer" : "not-allowed",
          transition: "background 200ms ease",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "var(--space-2)",
        }}
      >
        {status === "uploading" ? (
          <>Uploading…</>
        ) : (
          <>
            <Heart size={18} fill={files.length > 0 ? "#fff" : "transparent"} />
            Share {files.length > 0 ? `${files.length} ${files.length === 1 ? "file" : "files"}` : "your memories"}
          </>
        )}
      </button>

      {/* Privacy note */}
      <p style={{ textAlign: "center", fontSize: "var(--text-xs)", color: "var(--color-text-faint)", marginTop: "var(--space-4)" }}>
        🔒 Shared only with the Bell family · Visible in the password-protected gallery
      </p>
    </main>
  );
}
