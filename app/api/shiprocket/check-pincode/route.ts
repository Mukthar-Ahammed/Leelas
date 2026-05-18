import { NextRequest } from "next/server";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { checkPincodeServiceability } from "@/lib/shiprocket";

// ─── GET /api/shiprocket/check-pincode?pincode=682001 ────────────────────────

export async function GET(req: NextRequest) {
  const pincode = req.nextUrl.searchParams.get("pincode");

  if (!pincode || !/^\d{6}$/.test(pincode)) {
    return apiError("INVALID_PINCODE", "A valid 6-digit pincode is required.", 400);
  }

  const result = await checkPincodeServiceability(pincode);
  return apiSuccess(result);
}
