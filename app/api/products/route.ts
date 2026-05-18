import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/auth";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";
import {
  productQuerySchema,
  createProductSchema,
} from "@/lib/validations/product";

const PRODUCT_INCLUDE = {
  images: { orderBy: { order: "asc" as const } },
  variants: { orderBy: { retailPrice: "asc" as const } },
  category: true,
  seo: true,
  _count: { select: { reviews: { where: { isApproved: true } } } },
} as const;

// ─── GET /api/products ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const raw = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = productQuerySchema.safeParse(raw);

  if (!parsed.success) {
    return apiError("INVALID_QUERY", parsed.error.flatten().fieldErrors as unknown as string, 400);
  }

  const { category, minPrice, maxPrice, search, page, limit, sort } = parsed.data;

  const where = {
    isActive: true,
    ...(category ? { category: { slug: category } } : {}),
    ...(search ? { name: { contains: search, mode: "insensitive" as const } } : {}),
    ...(minPrice !== undefined || maxPrice !== undefined
      ? {
          variants: {
            some: {
              retailPrice: {
                ...(minPrice !== undefined && { gte: minPrice }),
                ...(maxPrice !== undefined && { lte: maxPrice }),
              },
            },
          },
        }
      : {}),
  };

  const priceSort = sort === "price-asc" || sort === "price-desc";

  if (priceSort) {
    // Fetch all matching products, sort by minimum variant price in JS,
    // then slice for pagination.
    const all = await db.product.findMany({ where, include: PRODUCT_INCLUDE });

    const sorted = all.sort((a, b) => {
      const aMin = a.variants.reduce(
        (m, v) => Math.min(m, v.retailPrice),
        Infinity
      );
      const bMin = b.variants.reduce(
        (m, v) => Math.min(m, v.retailPrice),
        Infinity
      );
      return sort === "price-asc" ? aMin - bMin : bMin - aMin;
    });

    const total = sorted.length;
    const items = sorted.slice((page - 1) * limit, page * limit);
    return apiSuccess({ items, total, page, totalPages: Math.ceil(total / limit) });
  }

  const orderBy =
    sort === "newest" || sort === "relevance"
      ? { createdAt: "desc" as const }
      : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    db.product.findMany({
      where,
      include: PRODUCT_INCLUDE,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  return apiSuccess({ items, total, page, totalPages: Math.ceil(total / limit) });
}

// ─── POST /api/products ───────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const body = await req.json().catch(() => null);
  if (!body) return apiError("INVALID_BODY", "Request body must be JSON.", 400);

  const parsed = createProductSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("VALIDATION_ERROR", JSON.stringify(parsed.error.flatten()), 400);
  }

  const { isActive, ...rest } = parsed.data;

  const product = await db.product.create({
    data: {
      ...rest,
      isActive: isActive ?? true,
      seo: { create: { isOverridden: false } },
    },
    include: PRODUCT_INCLUDE,
  });

  await db.auditLog.create({
    data: {
      adminId: guard.adminId,
      action: "PRODUCT_CREATED",
      targetType: "PRODUCT",
      targetId: product.id,
    },
  });

  return apiSuccess(product, 201);
}
