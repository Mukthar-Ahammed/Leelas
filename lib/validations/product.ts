import { z } from "zod";

// ─── Variant ────────────────────────────────────────────────────────────────

export const createVariantSchema = z.object({
  weight: z.string().min(1, "Weight is required"),
  sku: z.string().optional(),
  retailPrice: z.number().int().positive("Retail price must be positive (in paise)"),
  wholesalePrice: z.number().int().positive("Wholesale price must be positive (in paise)"),
  stock: z.number().int().min(0, "Stock cannot be negative"),
});

export const updateVariantSchema = z.object({
  weight: z.string().min(1).optional(),
  sku: z.string().min(1).optional(),
  retailPrice: z.number().int().positive().optional(),
  wholesalePrice: z.number().int().positive().optional(),
  stock: z.number().int().min(0).optional(),
});

// ─── Category ───────────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
});

// ─── Product ─────────────────────────────────────────────────────────────────

export const createProductSchema = z.object({
  name: z.string().min(2, "Name is required"),
  slug: z
    .string()
    .min(2)
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and hyphens"),
  description: z.string().min(1, "Description is required").min(10, "Must be at least 10 characters"),
  ingredients: z.string().optional(),
  usageSuggestions: z.string().optional(),
  categoryId: z.string().cuid("Invalid category ID"),
  isActive: z.boolean().optional(),
});

export const updateProductSchema = createProductSchema
  .omit({ slug: true })
  .partial()
  .extend({
    metaTitle: z.string().max(60).optional(),
    metaDescription: z.string().max(160).optional(),
  });

// ─── Query ───────────────────────────────────────────────────────────────────

export const productQuerySchema = z.object({
  category: z.string().optional(),
  minPrice: z.coerce.number().int().positive().optional(),
  maxPrice: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  sort: z
    .enum(["relevance", "price-asc", "price-desc", "newest"])
    .default("newest"),
});

// ─── Image reorder ───────────────────────────────────────────────────────────

export const reorderImagesSchema = z.object({
  images: z.array(
    z.object({
      id: z.string().cuid(),
      order: z.number().int().min(0),
    })
  ),
});

// ─── Legacy (used by admin UI forms) ─────────────────────────────────────────

/** @deprecated use createProductSchema + createVariantSchema separately */
export const productVariantSchema = createVariantSchema;

/** @deprecated use createProductSchema */
export const productSchema = createProductSchema.extend({
  isActive: z.boolean(),
  variants: z.array(createVariantSchema).min(1, "At least one variant is required"),
  offerPercent: z.number().int().min(1).max(99).nullable().optional(),
  offerStartsAt: z.string().nullable().optional(),
  offerEndsAt: z.string().nullable().optional(),
  seo: z
    .object({
      metaTitle: z.string().max(60).optional(),
      metaDescription: z.string().max(160).optional(),
      isOverridden: z.boolean(),
    })
    .optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type CreateVariantInput = z.infer<typeof createVariantSchema>;
export type UpdateVariantInput = z.infer<typeof updateVariantSchema>;
export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type ProductQueryInput = z.infer<typeof productQuerySchema>;
/** @deprecated */
export type ProductInput = z.infer<typeof productSchema>;
