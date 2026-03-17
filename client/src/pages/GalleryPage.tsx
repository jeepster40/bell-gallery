import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Lock, X, ChevronLeft, ChevronRight, Play, Image, Heart } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Upload } from "@shared/schema";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Return the best thumbnail URL for a grid card */
function thumbUrl(item: Upload): string {
  if (item.cloudinaryThumb) return item.cloudinaryThumb;
  // Fallback: local file (only present if Cloudinary upload failed)
  return `/uploads/${item.filename}`;
}

/** Return the full-resolution URL for the lightbox */
function fullUrl(item: Upload): string {
  if (item.cloudinaryUrl) return item.cloudinaryUrl;
  return `/uploads/${item.filename}`;
}

export default function GalleryPage() {
  // Remember gallery unlock for the whole browser session
  const STORAGE_KEY = "gallery_unlocked";
  const savedPw = (() => { try { return sessionStorage.getItem(STORAGE_KEY) || ""; } catch { return ""; } })();
  const [password, setPassword] = useState(savedPw);
  const [authed, setAuthed] = useState(!!savedPw);
  const [authError, setAuthError] = useState(false);
  const [lightbox, setLightbox] = useState<{ idx: number } | null>(null);

  const { data: uploads, isLoading, refetch } = useQuery<Upload[]>({
    queryKey: ["/api/gallery", password],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/gallery?pw=${encodeURIComponent(password)}`);
      if (!res.ok) throw new Error("Invalid password");
      return res.json();
    },
    enabled: authed,
    staleTime: 0,
  });

  const handleUnlock = async () => {
    try {
      const res = await apiRequest("POST", "/api/verify-password", { password });
      const data = await res.json();
      if (data.valid) {
        setAuthed(true);
        setAuthError(false);
        try { sessionStorage.setItem(STORAGE_KEY, password); } catch {}
        refetch();
      } else {
        setAuthError(true);
      }
    } catch {
      setAuthError(true);
    }
  };

  const items = uploads || [];

  // Lightbox nav
  const prev = () => setLightbox((l) => l ? { idx: (l.idx - 1 + items.length) % items.length } : null);
  const next = () => setLightbox((l) => l ? { idx: (l.idx + 1) % items.length } : null);

  useEffect(() => {
    if (!lightbox) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [lightbox, items.length]);

  if (!authed) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-8) var(--space-6)" }}>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div style={{ fontSize: "56px", marginBottom: "var(--space-6)" }}>🔒</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 400, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Private Gallery
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-8)" }}>
            Enter the gallery password to view all photos and videos shared by guests.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Gallery password"
              autoComplete="current-password"
              data-testid="input-gallery-password"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: `1px solid ${authError ? "var(--color-error)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "var(--text-base)",
                fontFamily: "var(--font-body)",
                textAlign: "center",
                letterSpacing: "0.1em",
              }}
            />
            {authError && (
              <p style={{ color: "var(--color-error)", fontSize: "var(--text-sm)" }}>
                Incorrect password. Please try again.
              </p>
            )}
            <button
              onClick={handleUnlock}
              data-testid="btn-unlock-gallery"
              style={{
                padding: "0.75rem",
                borderRadius: "var(--radius-full)",
                background: "var(--color-primary)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.5rem",
              }}
            >
              <Lock size={16} />
              Unlock Gallery
            </button>
          </div>
          <p style={{ marginTop: "var(--space-6)", fontSize: "var(--text-xs)", color: "var(--color-text-faint)" }}>
            Password provided by the Bell family
          </p>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--space-8) var(--space-6) var(--space-16)" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "var(--space-8)" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-2xl)", fontWeight: 400, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
          Mr. & Mrs. Bell Gallery
        </h1>
        <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>
          {isLoading ? "Loading…" : `${items.length} ${items.length === 1 ? "memory" : "memories"} shared`}
        </p>
      </div>

      {isLoading && (
        <div className="gallery-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ aspectRatio: "1", borderRadius: "var(--radius-lg)" }} />
          ))}
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div style={{ textAlign: "center", padding: "var(--space-16) var(--space-8)" }}>
          <Image size={48} style={{ color: "var(--color-text-faint)", margin: "0 auto var(--space-4)" }} />
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-base)" }}>No photos yet — be the first to share!</p>
          <a href="#/" style={{ display: "inline-flex", alignItems: "center", gap: "0.375rem", marginTop: "var(--space-4)", padding: "0.5rem 1.25rem", borderRadius: "var(--radius-full)", background: "var(--color-primary)", color: "#fff", textDecoration: "none", fontSize: "var(--text-sm)", fontWeight: 500 }}>
            Upload a photo
          </a>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="gallery-grid">
          {items.map((item, idx) => (
            <div
              key={item.id}
              className="media-card"
              onClick={() => setLightbox({ idx })}
              data-testid={`gallery-item-${item.id}`}
              title={item.caption || item.originalName}
            >
              {/* All grid cards use an <img> — videos use the Cloudinary JPG thumbnail */}
              <img
                src={thumbUrl(item)}
                alt={item.caption || item.originalName}
                loading="lazy"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {/* Video badge */}
              {item.resourceType === "video" && (
                <div style={{ position: "absolute", bottom: "8px", right: "8px", background: "rgba(0,0,0,0.55)", borderRadius: "50%", width: "32px", height: "32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Play size={14} fill="#fff" color="#fff" />
                </div>
              )}
              {item.uploaderName && (
                <div style={{ position: "absolute", bottom: "0", left: "0", right: "0", padding: "1rem 0.75rem 0.5rem", background: "linear-gradient(transparent, rgba(0,0,0,0.55))", color: "#fff", fontSize: "var(--text-xs)", opacity: 0, transition: "opacity 200ms ease" }}
                  className="card-caption"
                >
                  {item.uploaderName}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Lightbox */}
      {lightbox && items[lightbox.idx] && (
        <div className="lightbox-overlay" onClick={() => setLightbox(null)} data-testid="lightbox">
          <button
            onClick={(e) => { e.stopPropagation(); prev(); }}
            data-testid="lightbox-prev"
            style={{ position: "absolute", left: "16px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 10 }}
          >
            <ChevronLeft size={24} />
          </button>

          <div style={{ maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--space-3)" }} onClick={(e) => e.stopPropagation()}>
            {items[lightbox.idx].resourceType === "video" ? (
              <video
                src={fullUrl(items[lightbox.idx])}
                controls
                autoPlay
                style={{ maxWidth: "90vw", maxHeight: "75vh", borderRadius: "var(--radius-lg)" }}
                data-testid="lightbox-video"
              />
            ) : (
              <img
                src={fullUrl(items[lightbox.idx])}
                alt={items[lightbox.idx].caption || ""}
                style={{ maxWidth: "90vw", maxHeight: "75vh", objectFit: "contain", borderRadius: "var(--radius-lg)" }}
                data-testid="lightbox-image"
              />
            )}
            <div style={{ textAlign: "center", color: "rgba(255,255,255,0.8)" }}>
              {items[lightbox.idx].caption && (
                <p style={{ fontSize: "var(--text-base)", fontFamily: "var(--font-display)", fontStyle: "italic", marginBottom: "var(--space-1)" }}>
                  "{items[lightbox.idx].caption}"
                </p>
              )}
              <p style={{ fontSize: "var(--text-xs)", opacity: 0.6 }}>
                {items[lightbox.idx].uploaderName && `${items[lightbox.idx].uploaderName} · `}
                {formatDate(items[lightbox.idx].uploadedAt)} · {formatSize(items[lightbox.idx].size)}
              </p>
              <p style={{ fontSize: "var(--text-xs)", opacity: 0.4, marginTop: "0.25rem" }}>
                {lightbox.idx + 1} / {items.length}
              </p>
            </div>
          </div>

          <button
            onClick={(e) => { e.stopPropagation(); next(); }}
            data-testid="lightbox-next"
            style={{ position: "absolute", right: "16px", top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "48px", height: "48px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer", zIndex: 10 }}
          >
            <ChevronRight size={24} />
          </button>

          <button
            onClick={() => setLightbox(null)}
            data-testid="lightbox-close"
            style={{ position: "absolute", top: "16px", right: "16px", background: "rgba(255,255,255,0.1)", border: "none", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", cursor: "pointer" }}
          >
            <X size={20} />
          </button>
        </div>
      )}

      <style>{`.media-card:hover .card-caption { opacity: 1 !important; }`}</style>
    </main>
  );
}
