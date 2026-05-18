"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validations/product";

type Category = { id: string; name: string };
type PendingImage = { id: string; file: File; previewUrl: string };

function startOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function endOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

function generateSlug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function generateSku(productName: string, weight: string) {
  const n = productName.toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "");
  const w = weight.toUpperCase().replace(/[^A-Z0-9]+/g, "");
  return `${n}-${w}`;
}

export default function NewProductPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const [images, setImages] = useState<PendingImage[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerPercent, setOfferPercent] = useState("");
  const [offerStartsAt, setOfferStartsAt] = useState("");
  const [offerEndsAt, setOfferEndsAt] = useState("");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? d));
  }, []);

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<ProductInput>({
      resolver: zodResolver(productSchema),
      defaultValues: {
        isActive: true,
        variants: [{ weight: "", retailPrice: 0, wholesalePrice: 0, stock: 0 }],
      },
    });

  const nameValue = watch("name");
  const isActive = watch("isActive");

  useEffect(() => {
    const slug = generateSlug(nameValue ?? "");
    setValue("slug", slug, { shouldValidate: false });
  }, [nameValue, setValue]);

  const { fields, append, remove } = useFieldArray({ control, name: "variants" });

  function handleNewCatName(val: string) {
    setNewCatName(val);
    setNewCatSlug(val.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }

  async function createCategory() {
    setCreatingCat(true);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newCatName, slug: newCatSlug }),
    });
    const json = await res.json();
    if (res.ok) {
      const cat: Category = json.data ?? json;
      setCategories((prev) => [...prev, cat].sort((a, b) => a.name.localeCompare(b.name)));
      setShowNewCat(false);
      setNewCatName("");
      setNewCatSlug("");
      setTimeout(() => setValue("categoryId", cat.id, { shouldValidate: true }), 0);
    }
    setCreatingCat(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...next]);
    e.target.value = "";
  }

  function removeImage(id: string) {
    setImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function onSubmit(data: ProductInput) {
    setError(null);
    const offerPayload = offerEnabled && offerPercent
      ? {
          offerPercent: parseInt(offerPercent),
          offerStartsAt: offerStartsAt ? startOfDay(offerStartsAt) : null,
          offerEndsAt: offerEndsAt ? endOfDay(offerEndsAt) : null,
        }
      : { offerPercent: null, offerStartsAt: null, offerEndsAt: null };

    const enrichedVariants = data.variants.map((v) => ({
      ...v,
      sku: generateSku(data.name, v.weight),
    }));

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, variants: enrichedVariants, ...offerPayload }),
    });

    if (!res.ok) {
      try {
        const json = await res.json();
        setError(typeof json.error === "string" ? json.error : "Failed to create product");
      } catch {
        setError("Failed to create product");
      }
      return;
    }

    const product = await res.json();
    const slug: string = product.slug;

    for (const img of images) {
      const fd = new FormData();
      fd.append("image", img.file);
      await fetch(`/api/products/${slug}/images`, { method: "POST", body: fd });
    }

    router.push("/admin/products");
    router.refresh();
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-4 mb-8">
        <a href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
          ← Products
        </a>
        <h1 className="text-3xl font-bold">Add Product</h1>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Hidden slug — auto-generated from name */}
        <input type="hidden" {...register("slug")} />

        {/* Basic Info */}
        <section className="border rounded-2xl p-6 space-y-4">
          <h2 className="font-semibold text-lg">Basic Information</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Product Name</label>
            <input
              {...register("name")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
              placeholder="e.g. Kerala Black Pepper"
            />
            {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            {nameValue && (
              <p className="text-xs text-muted-foreground mt-1">
                Slug: <span className="font-mono">{generateSlug(nameValue)}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium">Category</label>
              <button
                type="button"
                onClick={() => setShowNewCat((s) => !s)}
                className="text-xs text-orange-700 hover:underline font-medium"
              >
                {showNewCat ? "Cancel" : "+ New category"}
              </button>
            </div>
            <select
              {...register("categoryId")}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 bg-background"
            >
              <option value="">Select a category…</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
            {errors.categoryId && <p className="text-red-600 text-xs mt-1">{errors.categoryId.message}</p>}

            {showNewCat && (
              <div className="mt-3 p-4 border rounded-xl bg-muted/30 space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">New Category</p>
                <div>
                  <label className="block text-xs font-medium mb-1">Name</label>
                  <input
                    value={newCatName}
                    onChange={(e) => handleNewCatName(e.target.value)}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    placeholder="e.g. Whole Spices"
                  />
                </div>
                <button
                  type="button"
                  disabled={!newCatName || !newCatSlug || creatingCat}
                  onClick={createCategory}
                  className="text-xs bg-orange-700 text-white px-4 py-1.5 rounded-lg hover:bg-orange-800 disabled:opacity-50 transition-colors"
                >
                  {creatingCat ? "Creating…" : "Create"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 resize-none"
              placeholder="Product description..."
            />
            {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ingredients</label>
            <textarea
              {...register("ingredients")}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 resize-none"
              placeholder="e.g. 100% whole black peppercorns"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Usage Suggestions</label>
            <textarea
              {...register("usageSuggestions")}
              rows={2}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 resize-none"
              placeholder="How to use this spice..."
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Visible on store</span>
            <button
              type="button"
              onClick={() => setValue("isActive", !isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? "bg-green-500" : "bg-gray-300"
              }`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                isActive ? "translate-x-6" : "translate-x-1"
              }`} />
            </button>
          </div>
        </section>

        {/* Images */}
        <section className="border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Images</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder. First image is the cover.</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {images.map((img, i) => (
              <div
                key={img.id}
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(i)}
                onDragEnd={() => setDragIndex(null)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-opacity ${
                  dragIndex === i ? "opacity-40 border-orange-700" : "border-transparent"
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                {i === 0 && (
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-md">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}

            <label className="aspect-square rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center cursor-pointer hover:border-orange-700 hover:bg-orange-50/30 transition-colors">
              <span className="text-xl text-muted-foreground leading-none">+</span>
              <span className="text-xs text-muted-foreground mt-1">Add photo</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="sr-only"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </section>

        {/* Variants */}
        <section className="border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Variants</h2>
            <button
              type="button"
              onClick={() => append({ weight: "", retailPrice: 0, wholesalePrice: 0, stock: 0 })}
              className="text-sm text-orange-700 hover:underline font-medium"
            >
              + Add Variant
            </button>
          </div>

          {fields.map((field, i) => (
            <div key={field.id} className="border rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">Variant {i + 1}</span>
                {fields.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Weight</label>
                  <input
                    {...register(`variants.${i}.weight`)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    placeholder="e.g. 250g"
                  />
                  {errors.variants?.[i]?.weight && (
                    <p className="text-red-600 text-xs mt-1">{errors.variants[i]?.weight?.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Stock (units)</label>
                  <input
                    {...register(`variants.${i}.stock`, { valueAsNumber: true })}
                    type="number"
                    min={0}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Retail Price (₹)</label>
                  <input
                    {...register(`variants.${i}.retailPrice`, {
                      setValueAs: (v) => Math.round(parseFloat(v) * 100) || 0,
                    })}
                    type="number"
                    step="0.01"
                    min={0}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    placeholder="0.00"
                  />
                  {errors.variants?.[i]?.retailPrice && (
                    <p className="text-red-600 text-xs mt-1">{errors.variants[i]?.retailPrice?.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Wholesale Price (₹)</label>
                  <input
                    {...register(`variants.${i}.wholesalePrice`, {
                      setValueAs: (v) => Math.round(parseFloat(v) * 100) || 0,
                    })}
                    type="number"
                    step="0.01"
                    min={0}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    placeholder="0.00"
                  />
                  {errors.variants?.[i]?.wholesalePrice && (
                    <p className="text-red-600 text-xs mt-1">{errors.variants[i]?.wholesalePrice?.message}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          {errors.variants && !Array.isArray(errors.variants) && (
            <p className="text-red-600 text-xs">{errors.variants.message}</p>
          )}
        </section>

        {/* Offer / Sale */}
        <section className="border rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-lg">Offer Price</h2>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={offerEnabled}
                onChange={(e) => setOfferEnabled(e.target.checked)}
                className="rounded"
              />
              <span className="text-sm font-medium">Enable offer</span>
            </label>
          </div>

          {offerEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium mb-1">Discount %</label>
                <input
                  type="number"
                  min={1}
                  max={99}
                  value={offerPercent}
                  onChange={(e) => setOfferPercent(e.target.value)}
                  placeholder="e.g. 20"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Starts (optional)</label>
                <input
                  type="date"
                  value={offerStartsAt}
                  onChange={(e) => setOfferStartsAt(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Ends</label>
                <input
                  type="date"
                  value={offerEndsAt}
                  onChange={(e) => setOfferEndsAt(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                />
              </div>
            </div>
          )}
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-orange-700 text-white px-8 py-2.5 rounded-full font-semibold hover:bg-orange-800 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? "Creating…" : "Create Product"}
          </button>
          <a
            href="/admin/products"
            className="px-8 py-2.5 rounded-full border font-semibold hover:bg-muted transition-colors text-sm"
          >
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
