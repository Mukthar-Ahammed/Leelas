import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiSuccess, apiError, assertAdmin, isAuthError } from "@/lib/api-helpers";

export async function GET() {
  const session = await auth();
  const guard = assertAdmin(session);
  if (isAuthError(guard)) return guard;

  const products = await db.product.findMany({
    include: { category: true, variants: { select: { id: true } } },
    orderBy: { createdAt: "desc" },
  });

  return apiSuccess(products);
}
