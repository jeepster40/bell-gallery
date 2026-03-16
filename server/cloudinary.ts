import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "dsxd3fzyo",
  api_key: process.env.CLOUDINARY_API_KEY || "713463948385651",
  api_secret: process.env.CLOUDINARY_API_SECRET || "VN0oBiMBRvi4IEQngmpQ0Ku9I_M",
  secure: true,
});

export interface CloudinaryResult {
  publicId: string;
  url: string;
  thumbnailUrl: string;
  resourceType: "image" | "video";
  bytes: number;
}

export async function uploadToCloudinary(
  filePath: string,
  originalName: string,
  mimeType: string
): Promise<CloudinaryResult> {
  const isVideo = mimeType.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";

  const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
    resource_type: resourceType,
    folder: "bell-celebration",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    // For images: auto quality + format
    // For videos: keep original
    ...(isVideo
      ? {}
      : {
          transformation: [{ quality: "auto", fetch_format: "auto" }],
        }),
  });

  // Generate thumbnail URL
  const thumbnailUrl = isVideo
    ? cloudinary.url(result.public_id, {
        resource_type: "video",
        transformation: [
          { width: 400, height: 400, crop: "fill", start_offset: "0" },
          { format: "jpg" },
        ],
      })
    : cloudinary.url(result.public_id, {
        transformation: [
          { width: 400, height: 400, crop: "fill", quality: "auto" },
        ],
      });

  return {
    publicId: result.public_id,
    url: result.secure_url,
    thumbnailUrl,
    resourceType,
    bytes: result.bytes,
  };
}

export async function deleteFromCloudinary(
  publicId: string,
  resourceType: "image" | "video"
): Promise<void> {
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}
