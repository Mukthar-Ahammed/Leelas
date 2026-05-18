type VariantPrices = {
  retailPrice: number;
  wholesalePrice: number;
};

export function getDisplayPrice(
  variant: VariantPrices,
  userRole: string | undefined
): number {
  return userRole === "WHOLESALE" ? variant.wholesalePrice : variant.retailPrice;
}
