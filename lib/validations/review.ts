import { z } from "zod";

export const reviewSchema = z.object({
  productId: z.string().cuid("Invalid product"),
  rating: z.number().int().min(1, "Rating must be at least 1").max(5, "Rating must be at most 5"),
  comment: z.string().max(1000, "Comment must be under 1000 characters").optional(),
});

export type ReviewInput = z.infer<typeof reviewSchema>;
