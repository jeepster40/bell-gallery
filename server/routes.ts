import type { Express, Request, Response } from "express";
import { Server } from "http";
import multer from "multer";
import path from "path";
import fs from "fs";
import { storage } from "./storage";
import { uploadToCloudinary, deleteFromCloudinary } from "./cloudinary";

const GALLERY_PASSWORD = "BellWedding2026";
const ADMIN_PIN = "4218";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif|mp4|mov|avi|webm/i;
    if (allowed.test(path.extname(file.originalname)) || allowed.test(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only images and videos are allowed"));
    }
  },
});

export function registerRoutes(httpServer: Server, app: Express) {
  // Upload endpoint — saves to Cloudinary, then deletes local temp file
  app.post("/api/upload", upload.array("files", 20), async (req: Request, res: Response) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "No files uploaded" });
      }

      const uploaderName = req.body.name as string | undefined;
      const caption = req.body.caption as string | undefined;
      const now = new Date().toISOString();

      const saved = await Promise.all(
        files.map(async (file) => {
          // Upload to Cloudinary
          let cloudinaryId: string | null = null;
          let cloudinaryUrl: string | null = null;
          let cloudinaryThumb: string | null = null;
          let resourceType: string | null = null;

          try {
            const result = await uploadToCloudinary(file.buffer, file.originalname, file.mimetype, uploaderName, caption);
            cloudinaryId = result.publicId;
            cloudinaryUrl = result.url;
            cloudinaryThumb = result.thumbnailUrl;
            resourceType = result.resourceType;
          } catch (err) {
            console.error("Cloudinary upload failed:", err);
            // Fall through — still save record, just without Cloudinary URLs
          }

          return storage.addUpload({
            filename: file.originalname,
            originalName: file.originalname,
            mimeType: file.mimetype,
            size: file.size,
            uploaderName: uploaderName || null,
            caption: caption || null,
            uploadedAt: now,
            approved: true,
            cloudinaryId,
            cloudinaryUrl,
            cloudinaryThumb,
            resourceType,
          });
        })
      );

      res.json({ success: true, count: saved.length, uploads: saved });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get all uploads (gallery — requires password)
  app.get("/api/gallery", async (req: Request, res: Response) => {
    const pw = req.query.pw as string;
    if (pw !== GALLERY_PASSWORD) {
      return res.status(401).json({ error: "Invalid password" });
    }
    const all = await storage.getUploads();
    res.json(all.filter((u) => u.approved));
  });

  // Get all uploads (admin — requires PIN)
  app.get("/api/admin/uploads", async (req: Request, res: Response) => {
    const pin = req.query.pin as string;
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    const all = await storage.getUploads();
    res.json(all);
  });

  // Delete upload (admin) — also removes from Cloudinary
  app.delete("/api/admin/uploads/:id", async (req: Request, res: Response) => {
    const pin = req.query.pin as string;
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    const id = parseInt(req.params.id);
    const item = await storage.getUpload(id);
    if (!item) return res.status(404).json({ error: "Not found" });

    // Delete from Cloudinary if we have a public ID
    if (item.cloudinaryId && item.resourceType) {
      try {
        await deleteFromCloudinary(
          item.cloudinaryId,
          item.resourceType as "image" | "video"
        );
      } catch (err) {
        console.error("Cloudinary delete failed:", err);
      }
    }

    await storage.deleteUpload(id);
    res.json({ success: true });
  });

  // Toggle approval (admin)
  app.patch("/api/admin/uploads/:id/approve", async (req: Request, res: Response) => {
    const pin = req.query.pin as string;
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    const id = parseInt(req.params.id);
    const updated = await storage.toggleApproval(id);
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json(updated);
  });

  // Verify gallery password
  app.post("/api/verify-password", (req: Request, res: Response) => {
    const { password } = req.body;
    res.json({ valid: password === GALLERY_PASSWORD });
  });

  // Verify admin PIN
  app.post("/api/verify-pin", (req: Request, res: Response) => {
    const { pin } = req.body;
    res.json({ valid: pin === ADMIN_PIN });
  });

  // Manual Cloudinary sync (admin)
  app.post("/api/admin/sync", async (req: Request, res: Response) => {
    const pin = req.query.pin as string;
    if (pin !== ADMIN_PIN) {
      return res.status(401).json({ error: "Invalid PIN" });
    }
    try {
      const added = await storage.syncFromCloudinary();
      res.json({ success: true, added });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });


  // Upload debug — captures exact Cloudinary error
  app.post("/api/debug/upload-test", upload.single("file"), async (req: Request, res: Response) => {
    const file = req.file as Express.Multer.File;
    if (!file) return res.status(400).json({ error: "no file" });
    try {
      const result = await uploadToCloudinary(file.buffer, file.originalname, file.mimetype);
      res.json({ ok: true, result });
    } catch (err: any) {
      res.status(500).json({ ok: false, error: String(err), nested: err?.error, message: err?.message || err?.error?.message, http_code: err?.http_code || err?.error?.http_code });
    }
  });

  // Temporary debug endpoint — test Cloudinary connectivity
  app.get("/api/debug/cloudinary", async (_req: Request, res: Response) => {
    try {
      const { v2: cld } = require("cloudinary");
      cld.config({
        cloud_name: "dsxd3fzyo",
        api_key: "713463948385651",
        api_secret: "VN0oBiMBRvi4IEQngmpQ0Ku9I_M",
        secure: true,
      });
      const ping = await cld.api.ping();
      res.json({ ok: true, ping, env_cloud: process.env.CLOUDINARY_CLOUD_NAME || "not set" });
    } catch (err: any) {
      res.status(500).json({ ok: false, nested_error: err?.error, message: err?.error?.message, http_code: err?.error?.http_code, env_cloud: process.env.CLOUDINARY_CLOUD_NAME || "not set" });
    }
  });

  // Stats (public)
  app.get("/api/stats", async (_req: Request, res: Response) => {
    const all = await storage.getUploads();
    res.json({ total: all.length, approved: all.filter((u) => u.approved).length });
  });
}
