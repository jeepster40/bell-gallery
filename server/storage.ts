import { type Upload, type InsertUpload } from "@shared/schema";
import fs from "fs";
import path from "path";

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
}

export class FileStorage implements IStorage {
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

  async getUploads(): Promise<Upload[]> {
    const uploads = readData();
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
}

export const storage = new FileStorage();
