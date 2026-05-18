import { v2 as cloudinary } from "cloudinary";
import type { UploadApiResponse } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type CloudinaryUploadResult = {
  url: string;
  publicId: string;
  altText: string;
};

export async function uploadProductImage(
  file: Buffer,
  productName: string,
  variant: string
): Promise<CloudinaryUploadResult> {
  const altText = `${productName} ${variant} - Leelas Homemade Spices`;

  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "leelas/products",
        transformation: [{ fetch_format: "auto", quality: "auto" }],
        context: { alt: altText },
      },
      (err, res) => {
        if (err || !res) reject(err ?? new Error("Upload failed"));
        else resolve(res);
      }
    );
    stream.end(file);
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
    altText,
  };
}

export async function deleteProductImage(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

export async function uploadInvoiceToCloudinary(
  buffer: Buffer,
  orderId: string
): Promise<string> {
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "leelas/invoices",
        public_id: `invoice-${orderId}`,
        resource_type: "raw",
        format: "pdf",
      },
      (err, res) => {
        if (err || !res) reject(err ?? new Error("Invoice upload failed"));
        else resolve(res);
      }
    );
    stream.end(buffer);
  });
  return result.secure_url;
}
