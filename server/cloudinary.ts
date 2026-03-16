import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";
import fs from "fs";

cloudinary.config({
  cloud_name: "dsxd3fzyo",
  api_key: "713463948385651",
  api_secret: "VN0oBiMBRvi4IEQngmpQ0Ku9I_M",
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
  mimeType: string,
  uploaderName?: string,
  caption?: string
): Promise<CloudinaryResult> {
  const isVideo = mimeType.startsWith("video/");
  const resourceType = isVideo ? "video" : "image";

  // Store metadata as Cloudinary context so we can recover from Cloudinary if DB is wiped
  const contextParts: string[] = [];
  if (uploaderName) contextParts.push(`uploader_name=${uploaderName.replace(/[|=]/g, " ")}`);
  if (caption) contextParts.push(`caption=${caption.replace(/[|=]/g, " ")}`);
  contextParts.push(`original_name=${originalName.replace(/[|=]/g, " ")}`);
  contextParts.push(`mime_type=${mimeType}`);

  const result: UploadApiResponse = await cloudinary.uploader.upload(filePath, {
    resource_type: resourceType,
    folder: "bell-celebration",
    use_filename: true,
    unique_filename: true,
    overwrite: false,
    context: contextParts.join("|"),
    // For images: auto quality + format
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

/** Fetch all assets from Cloudinary folder — used as fallback to rebuild the local JSON */
export async function fetchAllFromCloudinary(): Promise<CloudinaryResult[]> {
  const results: CloudinaryResult[] = [];

  for (const resourceType of ["image", "video"] as const) {
    let nextCursor: string | undefined;
    do {
      const response: any = await cloudinary.api.resources({
        resource_type: resourceType,
        type: "upload",
        prefix: "bell-celebration/",
        max_results: 500,
        context: true,
        next_cursor: nextCursor,
      });
      for (const asset of response.resources) {
        const thumbnailUrl =
          resourceType === "video"
            ? cloudinary.url(asset.public_id, {
                resource_type: "video",
                transformation: [
                  { width: 400, height: 400, crop: "fill", start_offset: "0" },
                  { format: "jpg" },
                ],
              })
            : cloudinary.url(asset.public_id, {
                transformation: [
                  { width: 400, height: 400, crop: "fill", quality: "auto" },
                ],
              });
        results.push({
          publicId: asset.public_id,
          url: asset.secure_url,
          thumbnailUrl,
          resourceType,
          bytes: asset.bytes,
        });
      }
      nextCursor = response.next_cursor;
    } while (nextCursor);
  }

  return results;
}
