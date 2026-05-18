type ProductForMeta = {
  name: string;
  description: string;
};

type VariantForMeta = {
  weight: string;
};

export function generateProductMeta(
  product: ProductForMeta,
  variant: VariantForMeta
): { title: string; description: string } {
  const title = `${product.name} – ${variant.weight} | Leelas Homemade Spices`;

  const raw = product.description.replace(/\s+/g, " ").trim();
  let description = raw.slice(0, 155);
  if (raw.length > 155) {
    const lastSpace = description.lastIndexOf(" ");
    description = description.slice(0, lastSpace > 0 ? lastSpace : 155);
  }

  return { title, description };
}

export function generateBreadcrumb(
  category: { name: string; slug: string },
  productName: string
): Array<{ name: string; href: string }> {
  return [
    { name: "Home", href: "/" },
    { name: "Products", href: "/products" },
    { name: category.name, href: `/products?category=${category.slug}` },
    { name: productName, href: "#" },
  ];
}
