import { v2 as cloudinary } from "cloudinary";
import sharp from "sharp";
import type { UploadApiResponse } from "cloudinary";

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
  fileBuffer: Buffer,
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

  // Compress large images before upload to avoid timeout on Render
  let uploadBuffer = fileBuffer;
  if (!isVideo && fileBuffer.length > 5 * 1024 * 1024) {
    try {
      uploadBuffer = await sharp(fileBuffer)
        .resize({ width: 4000, height: 4000, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toBuffer();
      console.log(`[cloudinary] Compressed ${fileBuffer.length} → ${uploadBuffer.length} bytes`);
    } catch (e) {
      console.warn("[cloudinary] Compression failed, using original:", e);
      uploadBuffer = fileBuffer;
    }
  }

  // Upload from buffer using upload_stream
  const result: UploadApiResponse = await new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        resource_type: resourceType,
        folder: "bell-celebration",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
        context: contextParts.join("|"),
        ...(isVideo ? {} : { transformation: [{ quality: "auto", fetch_format: "auto" }] }),
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result!);
      }
    );
    stream.end(uploadBuffer);
  });

  // Generate thumbnail URL — clean format, no signed params
  const cloudName = "dsxd3fzyo";
  const thumbTransform = "c_fill,h_400,w_400,q_auto";
  const thumbnailUrl = isVideo
    ? `https://res.cloudinary.com/${cloudName}/video/upload/${thumbTransform}/so_0,f_jpg/${result.public_id}.jpg`
    : `https://res.cloudinary.com/${cloudName}/image/upload/${thumbTransform}/${result.public_id}`;

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
        const thumbT = "c_fill,h_400,w_400,q_auto";
        const thumbnailUrl =
          resourceType === "video"
            ? `https://res.cloudinary.com/dsxd3fzyo/video/upload/${thumbT}/so_0,f_jpg/${asset.public_id}.jpg`
            : `https://res.cloudinary.com/dsxd3fzyo/image/upload/${thumbT}/${asset.public_id}`;
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
