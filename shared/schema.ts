import { pgTable, text, integer, boolean, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const uploads = pgTable("uploads", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  uploaderName: text("uploader_name"),
  caption: text("caption"),
  uploadedAt: text("uploaded_at").notNull(),
  approved: boolean("approved").default(true),
  // Cloudinary fields
  cloudinaryId: text("cloudinary_id"),
  cloudinaryUrl: text("cloudinary_url"),
  cloudinaryThumb: text("cloudinary_thumb"),
  resourceType: text("resource_type"), // 'image' | 'video'
});

export const insertUploadSchema = createInsertSchema(uploads).omit({ id: true });
export type InsertUpload = z.infer<typeof insertUploadSchema>;
export type Upload = typeof uploads.$inferSelect;
