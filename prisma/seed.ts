import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  const passwordHash = await bcrypt.hash("Admin@123", 12);
  const admin = await db.user.upsert({
    where: { email: "admin@leelas.in" },
    update: {},
    create: {
      email: "admin@leelas.in",
      passwordHash,
      name: "Leelas Admin",
      role: "ADMIN",
      referralCode: "ADMIN00",
    },
  });
  console.log("✅ Admin user created:", admin.email);

  const categories = await Promise.all([
    db.category.upsert({
      where: { slug: "whole-spices" },
      update: {},
      create: { name: "Whole Spices", slug: "whole-spices" },
    }),
    db.category.upsert({
      where: { slug: "ground-spices" },
      update: {},
      create: { name: "Ground Spices", slug: "ground-spices" },
    }),
    db.category.upsert({
      where: { slug: "spice-blends" },
      update: {},
      create: { name: "Spice Blends", slug: "spice-blends" },
    }),
  ]);
  console.log("✅ Categories created:", categories.map((c) => c.name).join(", "));

  const [wholeSpices, groundSpices, spiceBlends] = categories;

  const product1 = await db.product.upsert({
    where: { slug: "kerala-black-pepper" },
    update: {},
    create: {
      name: "Kerala Black Pepper",
      slug: "kerala-black-pepper",
      description:
        "Grown in the lush hills of Wayanad, our black pepper is sun-dried and hand-sorted for maximum aroma and heat. Rich in piperine with a bold, complex flavour — the true king of spices from God's Own Country.",
      ingredients: "100% whole black peppercorns (Piper nigrum)",
      usageSuggestions:
        "Use freshly ground in marinades, curries, rasam, pepper chicken, and as a table condiment. A few peppercorns in your chai adds warming depth.",
      categoryId: wholeSpices.id,
      isActive: true,
      variants: {
        create: [
          { weight: "100g", sku: "PEPPER-100G", retailPrice: 8000, wholesalePrice: 6500, stock: 120 },
          { weight: "250g", sku: "PEPPER-250G", retailPrice: 17500, wholesalePrice: 14000, stock: 80 },
          { weight: "500g", sku: "PEPPER-500G", retailPrice: 32000, wholesalePrice: 26000, stock: 40 },
        ],
      },
      images: {
        create: [
          { url: "/product-placeholder.jpg", altText: "Kerala Black Pepper", order: 0 },
        ],
      },
      seo: {
        create: {
          metaTitle: "Kerala Black Pepper – Wayanad's Finest | Leelas Homemade Spices",
          metaDescription:
            "Sun-dried Wayanad black pepper — hand-sorted for maximum aroma. 100% natural, no additives. Delivered fresh across Kerala.",
          isOverridden: true,
        },
      },
    },
  });
  console.log("✅ Product created:", product1.name);

  const product2 = await db.product.upsert({
    where: { slug: "kerala-garam-masala" },
    update: {},
    create: {
      name: "Kerala Garam Masala",
      slug: "kerala-garam-masala",
      description:
        "Our signature garam masala is stone-ground in small batches, combining 14 whole spices roasted to perfection. Unlike commercial blends, this contains no fillers, anti-caking agents, or artificial colours — just pure spice.",
      ingredients:
        "Coriander, cumin, black pepper, cardamom, cloves, cinnamon, star anise, fennel, mace, nutmeg, bay leaf, dried red chilli, turmeric, curry leaves",
      usageSuggestions:
        "Add 1/2 tsp at the end of cooking curries, biryanis, and meat dishes. Works beautifully in Kerala-style fish curry and chicken stew.",
      categoryId: spiceBlends.id,
      isActive: true,
      variants: {
        create: [
          { weight: "100g", sku: "GMASALA-100G", retailPrice: 9500, wholesalePrice: 7500, stock: 90 },
          { weight: "250g", sku: "GMASALA-250G", retailPrice: 21000, wholesalePrice: 17000, stock: 55 },
          { weight: "500g", sku: "GMASALA-500G", retailPrice: 38000, wholesalePrice: 30000, stock: 30 },
        ],
      },
      images: {
        create: [
          { url: "/product-placeholder.jpg", altText: "Kerala Garam Masala", order: 0 },
        ],
      },
      seo: {
        create: {
          metaTitle: "Kerala Garam Masala – Stone-Ground Spice Blend | Leelas",
          metaDescription:
            "14-spice stone-ground Kerala garam masala with no fillers or additives. Small-batch, handmade. Delivered across Kerala.",
          isOverridden: true,
        },
      },
    },
  });
  console.log("✅ Product created:", product2.name);

  console.log("\n🎉 Seeding complete!");
  console.log("\n📋 Summary:");
  console.log("   Admin: admin@leelas.in / Admin@123");
  console.log("   Categories: Whole Spices, Ground Spices, Spice Blends");
  console.log("   Products: Kerala Black Pepper, Kerala Garam Masala");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
