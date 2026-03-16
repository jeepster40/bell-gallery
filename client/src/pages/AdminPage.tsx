import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Shield, Trash2, Eye, EyeOff, Download, BarChart3, Image, Film, RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Upload } from "@shared/schema";

function formatSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

/** Best thumbnail for admin list */
function thumbUrl(item: Upload): string {
  if (item.cloudinaryThumb) return item.cloudinaryThumb;
  return `/uploads/${item.filename}`;
}

/** Best download URL */
function downloadUrl(item: Upload): string {
  if (item.cloudinaryUrl) return item.cloudinaryUrl;
  return `/uploads/${item.filename}`;
}

export default function AdminPage() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [pinError, setPinError] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: uploads, isLoading, refetch } = useQuery<Upload[]>({
    queryKey: ["/api/admin/uploads", pin],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/uploads?pin=${encodeURIComponent(pin)}`);
      if (!res.ok) throw new Error("Unauthorized");
      return res.json();
    },
    enabled: authed,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/uploads/${id}?pin=${encodeURIComponent(pin)}`);
      if (!res.ok) throw new Error("Delete failed");
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/admin/uploads"] }); toast({ title: "Deleted" }); },
    onError: () => toast({ title: "Delete failed", variant: "destructive" }),
  });

  const approveMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("PATCH", `/api/admin/uploads/${id}/approve?pin=${encodeURIComponent(pin)}`);
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/admin/uploads"] }),
    onError: () => toast({ title: "Failed", variant: "destructive" }),
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/sync?pin=${encodeURIComponent(pin)}`);
      if (!res.ok) throw new Error("Sync failed");
      return res.json();
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["/api/admin/uploads"] });
      toast({ title: `Synced from Cloudinary`, description: `${data.added} new photo(s) recovered` });
    },
    onError: () => toast({ title: "Sync failed", variant: "destructive" }),
  });

  const handleUnlock = async () => {
    try {
      const res = await apiRequest("POST", "/api/verify-pin", { pin });
      const data = await res.json();
      if (data.valid) { setAuthed(true); setPinError(false); }
      else { setPinError(true); }
    } catch { setPinError(true); }
  };

  const items = uploads || [];
  const totalSize = items.reduce((acc, u) => acc + u.size, 0);
  const images = items.filter(u => u.mimeType.startsWith("image/"));
  const videos = items.filter(u => u.mimeType.startsWith("video/"));

  if (!authed) {
    return (
      <main style={{ minHeight: "80vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--space-8) var(--space-6)" }}>
        <div style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
          <div style={{ width: "64px", height: "64px", borderRadius: "50%", background: "rgba(192,80,112,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto var(--space-6)" }}>
            <Shield size={28} style={{ color: "var(--color-primary)" }} />
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 400, color: "var(--color-text)", marginBottom: "var(--space-2)" }}>
            Admin Panel
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)", marginBottom: "var(--space-8)" }}>
            Enter your admin PIN to manage all uploads.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              placeholder="Admin PIN"
              inputMode="numeric"
              maxLength={8}
              data-testid="input-admin-pin"
              style={{
                width: "100%",
                padding: "0.75rem 1rem",
                border: `1px solid ${pinError ? "var(--color-error)" : "var(--color-border)"}`,
                borderRadius: "var(--radius-md)",
                background: "var(--color-surface)",
                color: "var(--color-text)",
                fontSize: "var(--text-lg)",
                fontFamily: "var(--font-body)",
                textAlign: "center",
                letterSpacing: "0.3em",
              }}
            />
            {pinError && <p style={{ color: "var(--color-error)", fontSize: "var(--text-sm)" }}>Incorrect PIN.</p>}
            <button
              onClick={handleUnlock}
              data-testid="btn-unlock-admin"
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
              <Shield size={16} />
              Enter Admin
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "var(--space-8) var(--space-6) var(--space-16)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-8)", flexWrap: "wrap", gap: "var(--space-4)" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-xl)", fontWeight: 400, color: "var(--color-text)", marginBottom: "var(--space-1)" }}>
            Admin Panel
          </h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "var(--text-sm)" }}>Manage all guest uploads</p>
        </div>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          <button onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending} data-testid="btn-sync" style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", border: "1px solid var(--color-primary)", color: "var(--color-primary)", fontSize: "var(--text-sm)", background: "transparent", cursor: "pointer", opacity: syncMutation.isPending ? 0.6 : 1 }}>
            <RefreshCw size={14} style={{ animation: syncMutation.isPending ? "spin 1s linear infinite" : "none" }} />
            {syncMutation.isPending ? "Syncing…" : "Sync from Cloudinary"}
          </button>
          <button onClick={() => refetch()} data-testid="btn-refresh" style={{ display: "flex", alignItems: "center", gap: "0.375rem", padding: "0.5rem 1rem", borderRadius: "var(--radius-full)", border: "1px solid var(--color-border)", color: "var(--color-text-muted)", fontSize: "var(--text-sm)", background: "transparent", cursor: "pointer" }}>
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "var(--space-4)", marginBottom: "var(--space-8)" }}>
        {[
          { label: "Total uploads", value: items.length, icon: <BarChart3 size={20} /> },
          { label: "Photos", value: images.length, icon: <Image size={20} /> },
          { label: "Videos", value: videos.length, icon: <Film size={20} /> },
          { label: "Total size", value: formatSize(totalSize), icon: <Download size={20} /> },
        ].map((stat) => (
          <div key={stat.label} data-testid={`stat-${stat.label.replace(/\s/g, '-').toLowerCase()}`} style={{ background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-lg)", padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
            <div style={{ color: "var(--color-primary)" }}>{stat.icon}</div>
            <p style={{ fontSize: "var(--text-xl)", fontFamily: "var(--font-display)", fontWeight: 500, color: "var(--color-text)", lineHeight: 1 }}>{stat.value}</p>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Upload table */}
      {isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton" style={{ height: "72px", borderRadius: "var(--radius-md)" }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "var(--space-16)", color: "var(--color-text-muted)" }}>
          No uploads yet.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {items.map((item) => (
            <div
              key={item.id}
              data-testid={`admin-item-${item.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-4)",
                background: "var(--color-surface)",
                border: `1px solid ${item.approved ? "var(--color-border)" : "rgba(192,80,112,0.3)"}`,
                borderRadius: "var(--radius-lg)",
                padding: "var(--space-3) var(--space-4)",
                opacity: item.approved ? 1 : 0.6,
                flexWrap: "wrap",
              }}
            >
              {/* Thumbnail */}
              <div style={{ width: "56px", height: "56px", borderRadius: "var(--radius-md)", overflow: "hidden", background: "var(--color-surface-2)", flexShrink: 0 }}>
                {item.cloudinaryThumb ? (
                  /* Cloudinary provides a JPG thumbnail for both images and videos */
                  <img src={item.cloudinaryThumb} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : item.mimeType.startsWith("video/") ? (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Film size={20} style={{ color: "var(--color-text-muted)" }} />
                  </div>
                ) : (
                  <img src={`/uploads/${item.filename}`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                )}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: "120px" }}>
                <p style={{ fontSize: "var(--text-sm)", fontWeight: 500, color: "var(--color-text)", marginBottom: "0.25rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "260px" }}>
                  {item.originalName}
                </p>
                <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)" }}>
                  {item.uploaderName || "Anonymous"} · {formatDate(item.uploadedAt)} · {formatSize(item.size)}
                </p>
                {item.caption && (
                  <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-faint)", fontStyle: "italic", marginTop: "0.2rem" }}>
                    "{item.caption}"
                  </p>
                )}
              </div>

              {/* Status badge */}
              <div style={{
                padding: "0.2rem 0.6rem",
                borderRadius: "var(--radius-full)",
                fontSize: "var(--text-xs)",
                fontWeight: 500,
                background: item.approved ? "rgba(74,124,89,0.12)" : "rgba(192,80,112,0.12)",
                color: item.approved ? "var(--color-success)" : "var(--color-primary)",
              }}>
                {item.approved ? "Visible" : "Hidden"}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "var(--space-2)", alignItems: "center" }}>
                <a
                  href={downloadUrl(item)}
                  download={item.originalName}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-testid={`btn-download-${item.id}`}
                  style={{ padding: "0.375rem", borderRadius: "var(--radius-md)", color: "var(--color-text-muted)", display: "flex", alignItems: "center", textDecoration: "none" }}
                  title="Download"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={() => approveMutation.mutate(item.id)}
                  data-testid={`btn-toggle-${item.id}`}
                  title={item.approved ? "Hide from gallery" : "Show in gallery"}
                  style={{ padding: "0.375rem", borderRadius: "var(--radius-md)", color: item.approved ? "var(--color-text-muted)" : "var(--color-primary)", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  {item.approved ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => { if (confirm(`Delete "${item.originalName}"?`)) deleteMutation.mutate(item.id); }}
                  data-testid={`btn-delete-${item.id}`}
                  title="Delete permanently"
                  style={{ padding: "0.375rem", borderRadius: "var(--radius-md)", color: "var(--color-error)", border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center" }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Credentials reference */}
      <div style={{
        marginTop: "var(--space-12)",
        padding: "var(--space-6)",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-lg)",
      }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: "var(--text-lg)", fontWeight: 400, color: "var(--color-text)", marginBottom: "var(--space-4)" }}>
          Share with guests
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "var(--space-4)" }}>
          <div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Gallery password</p>
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--color-primary)", fontSize: "var(--text-base)", letterSpacing: "0.05em" }}>
              BellWedding2026
            </p>
          </div>
          <div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Admin PIN</p>
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--color-text-muted)", fontSize: "var(--text-base)", letterSpacing: "0.15em" }}>
              4218
            </p>
          </div>
          <div>
            <p style={{ fontSize: "var(--text-xs)", color: "var(--color-text-muted)", marginBottom: "var(--space-1)" }}>Cloud storage</p>
            <p style={{ fontFamily: "var(--font-body)", fontWeight: 600, color: "var(--color-success)", fontSize: "var(--text-base)" }}>
              Cloudinary ✓
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
