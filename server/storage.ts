import { type Upload, type InsertUpload } from "@shared/schema";
import fs from "fs";
import path from "path";
import { fetchAllFromCloudinary } from "./cloudinary";

// Persist uploads to a JSON file so they survive server restarts
const DATA_FILE = path.join(process.cwd(), "data", "uploads.json");

function ensureDataDir() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readData(): Upload[] {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  } catch {
    return [];
  }
}

function writeData(uploads: Upload[]) {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(uploads, null, 2), "utf-8");
}

export interface IStorage {
  addUpload(upload: InsertUpload): Promise<Upload>;
  getUploads(): Promise<Upload[]>;
  getUpload(id: number): Promise<Upload | undefined>;
  deleteUpload(id: number): Promise<void>;
  toggleApproval(id: number): Promise<Upload | undefined>;
  syncFromCloudinary(): Promise<number>;
}

export class FileStorage implements IStorage {
  private syncing = false;

  private getNextId(uploads: Upload[]): number {
    if (uploads.length === 0) return 1;
    return Math.max(...uploads.map((u) => u.id)) + 1;
  }

  async addUpload(upload: InsertUpload): Promise<Upload> {
    const uploads = readData();
    const newUpload: Upload = {
      ...upload,
      id: this.getNextId(uploads),
      approved: upload.approved ?? true,
    };
    uploads.push(newUpload);
    writeData(uploads);
    return newUpload;
  }

  /**
   * If the local JSON is empty, attempt to re-sync from Cloudinary.
   * This handles the case where Render's ephemeral disk was wiped after a deploy.
   */
  async getUploads(): Promise<Upload[]> {
    let uploads = readData();

    if (uploads.length === 0 && !this.syncing) {
      console.log("[storage] Local JSON empty — syncing from Cloudinary...");
      try {
        await this.syncFromCloudinary();
        uploads = readData();
      } catch (err) {
        console.error("[storage] Cloudinary sync failed:", err);
      }
    }

    return uploads.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
    );
  }

  async getUpload(id: number): Promise<Upload | undefined> {
    return readData().find((u) => u.id === id);
  }

  async deleteUpload(id: number): Promise<void> {
    const uploads = readData().filter((u) => u.id !== id);
    writeData(uploads);
  }

  async toggleApproval(id: number): Promise<Upload | undefined> {
    const uploads = readData();
    const idx = uploads.findIndex((u) => u.id === id);
    if (idx === -1) return undefined;
    uploads[idx] = { ...uploads[idx], approved: !uploads[idx].approved };
    writeData(uploads);
    return uploads[idx];
  }

  /**
   * Re-build the local JSON from Cloudinary assets.
   * Called automatically when the local JSON is empty.
   * Can also be called manually via POST /api/admin/sync.
   */
  async syncFromCloudinary(): Promise<number> {
    this.syncing = true;
    try {
      const existing = readData();
      const existingPublicIds = new Set(existing.map((u) => u.cloudinaryId).filter(Boolean));

      const cloudinaryAssets = await fetchAllFromCloudinary();
      let added = 0;
      const now = new Date().toISOString();
      let nextId = existing.length === 0 ? 1 : Math.max(...existing.map((u) => u.id)) + 1;

      for (const asset of cloudinaryAssets) {
        if (existingPublicIds.has(asset.publicId)) continue;

        // Try to recover metadata from Cloudinary context (stored at upload time)
        const contextStr = (asset as any).context?.custom || "";
        const ctx: Record<string, string> = {};
        for (const part of contextStr.split("|")) {
          const [k, ...rest] = part.split("=");
          if (k && rest.length) ctx[k.trim()] = rest.join("=").trim();
        }

        const upload: Upload = {
          id: nextId++,
          filename: asset.publicId.split("/").pop() || asset.publicId,
          originalName: ctx["original_name"] || asset.publicId.split("/").pop() || "photo",
          mimeType:
            ctx["mime_type"] ||
            (asset.resourceType === "video" ? "video/mp4" : "image/jpeg"),
          size: asset.bytes,
          uploaderName: ctx["uploader_name"] || null,
          caption: ctx["caption"] || null,
          uploadedAt: now,
          approved: true,
          cloudinaryId: asset.publicId,
          cloudinaryUrl: asset.url,
          cloudinaryThumb: asset.thumbnailUrl,
          resourceType: asset.resourceType,
        };

        existing.push(upload);
        added++;
      }

      writeData(existing);
      console.log(`[storage] Synced ${added} new assets from Cloudinary (total: ${existing.length})`);
      return added;
    } finally {
      this.syncing = false;
    }
  }
}

export const storage = new FileStorage();
