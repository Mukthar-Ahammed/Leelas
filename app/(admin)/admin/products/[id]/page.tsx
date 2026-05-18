"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

function startOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 0, 0, 0, 0).toISOString();
}

function endOfDay(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 23, 59, 59, 999).toISOString();
}

const editSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z.string().min(1, "Description is required").min(10, "Must be at least 10 characters"),
  ingredients: z.string().optional(),
  usageSuggestions: z.string().optional(),
  isActive: z.boolean(),
  categoryId: z.string().min(1, "Please select a category"),
});

type EditInput = z.infer<typeof editSchema>;
type Category = { id: string; name: string };
type Variant = { id: string; weight: string; sku: string; retailPrice: number; wholesalePrice: number; stock: number };
type ServerImage = { id: string; url: string; altText: string | null; order: number; publicId: string | null };
type ImageItem =
  | { kind: "server"; id: string; url: string; altText: string | null }
  | { kind: "pending"; localId: string; file: File; previewUrl: string };
type Product = {
  id: string;
  name: string;
  slug: string;
  description: string;
  ingredients: string | null;
  usageSuggestions: string | null;
  isActive: boolean;
  categoryId: string;
  category: { id: string; name: string };
  variants: Variant[];
  images: ServerImage[];
  offerPercent: number | null;
  offerStartsAt: string | null;
  offerEndsAt: string | null;
};

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<Product | null>(null);
  const [variants, setVariants] = useState<Variant[]>([]);
  const [imageItems, setImageItems] = useState<ImageItem[]>([]);
  const [toDelete, setToDelete] = useState<string[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatSlug, setNewCatSlug] = useState("");
  const [creatingCat, setCreatingCat] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [offerEnabled, setOfferEnabled] = useState(false);
  const [offerPercent, setOfferPercent] = useState("");
  const [offerStartsAt, setOfferStartsAt] = useState("");
  const [offerEndsAt, setOfferEndsAt] = useState("");

  const { register, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } =
    useForm<EditInput>({ resolver: zodResolver(editSchema) });

  const isActive = watch("isActive");

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((d) => setCategories(d.data ?? d));
  }, []);

  useEffect(() => {
    fetch(`/api/admin/products/${id}`)
      .then((r) => r.json())
      .then((data: Product) => {
        setProduct(data);
        setVariants(data.variants);
        setImageItems(
          (data.images ?? []).map((img) => ({
            kind: "server" as const,
            id: img.id,
            url: img.url,
            altText: img.altText,
          }))
        );
        if (data.offerPercent) {
          setOfferEnabled(true);
          setOfferPercent(String(data.offerPercent));
          setOfferStartsAt(data.offerStartsAt ? data.offerStartsAt.slice(0, 10) : "");
          setOfferEndsAt(data.offerEndsAt ? data.offerEndsAt.slice(0, 10) : "");
        }
        reset({
          name: data.name,
          description: data.description,
          ingredients: data.ingredients ?? "",
          usageSuggestions: data.usageSuggestions ?? "",
          isActive: data.isActive,
          categoryId: data.categoryId,
        });
      })
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id, reset]);

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
    e.target.value = "";
    if (!files.length) return;
    const newItems: ImageItem[] = files.map((file) => ({
      kind: "pending",
      localId: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setImageItems((prev) => [...prev, ...newItems]);
  }

  function removeImage(item: ImageItem) {
    if (item.kind === "server") {
      setToDelete((prev) => [...prev, item.id]);
    } else {
      URL.revokeObjectURL(item.previewUrl);
    }
    setImageItems((prev) =>
      prev.filter((i) => (i.kind === "server" ? i.id !== item.id : i.localId !== item.localId))
    );
  }

  function handleDrop(toIndex: number) {
    if (dragIndex === null || dragIndex === toIndex) return;
    setImageItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDragIndex(null);
  }

  async function onSubmit(data: EditInput) {
    setError(null);
    setSuccess(false);
    const offerPayload = offerEnabled && offerPercent
      ? {
          offerPercent: parseInt(offerPercent),
          offerStartsAt: offerStartsAt ? startOfDay(offerStartsAt) : null,
          offerEndsAt: offerEndsAt ? endOfDay(offerEndsAt) : null,
        }
      : { offerPercent: null, offerStartsAt: null, offerEndsAt: null };

    const res = await fetch("/api/admin/products", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...data, ...offerPayload }),
    });
    if (!res.ok) {
      try {
        const json = await res.json();
        setError(typeof json.error === "string" ? json.error : "Failed to update product");
      } catch {
        setError("Failed to update product");
      }
      return;
    }

    // Delete removed images
    for (const imageId of toDelete) {
      await fetch(`/api/products/${product!.slug}/images/${imageId}`, { method: "DELETE" });
    }
    setToDelete([]);

    // Upload pending images and build final ordered list
    const finalOrder: string[] = [];
    for (const item of imageItems) {
      if (item.kind === "server") {
        finalOrder.push(item.id);
      } else {
        const fd = new FormData();
        fd.append("image", item.file);
        const uploadRes = await fetch(`/api/products/${product!.slug}/images`, { method: "POST", body: fd });
        const uploadJson = await uploadRes.json();
        if (uploadRes.ok) finalOrder.push((uploadJson.data ?? uploadJson).id);
      }
    }

    // Reorder to match current display order
    if (finalOrder.length > 0) {
      await fetch(`/api/products/${product!.slug}/images/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images: finalOrder.map((id, i) => ({ id, order: i })) }),
      });
      // Refresh imageItems to server state
      setImageItems(finalOrder.map((id) => {
        const existing = imageItems.find((item) => item.kind === "server" && item.id === id);
        return existing as ImageItem ?? { kind: "server", id, url: "", altText: null };
      }));
    }

    setSuccess(true);
    router.refresh();
  }

  async function updateVariant(variantId: string, field: keyof Variant, raw: string) {
    const value = field === "stock" || field === "retailPrice" || field === "wholesalePrice"
      ? field === "stock" ? parseInt(raw) : Math.round(parseFloat(raw) * 100)
      : raw;
    setVariants((prev) => prev.map((v) => v.id === variantId ? { ...v, [field]: value } : v));
  }

  async function saveVariant(variantId: string) {
    const variant = variants.find((v) => v.id === variantId);
    if (!variant) return;
    await fetch("/api/admin/products/variants", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(variant),
    });
  }

  async function hardDelete() {
    if (!confirm("Permanently delete this product? This cannot be undone.")) return;
    const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => null);
      setError(json?.error ?? "Failed to delete product");
      return;
    }
    router.push("/admin/products");
    router.refresh();
  }

  if (loading) return <div className="text-muted-foreground py-12 text-center">Loading...</div>;
  if (!product) return <div className="text-red-600 py-12 text-center">Product not found</div>;

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <a href="/admin/products" className="text-sm text-muted-foreground hover:text-foreground">
            ← Products
          </a>
          <h1 className="text-3xl font-bold">Edit Product</h1>
        </div>
        <button onClick={hardDelete} className="text-sm text-red-600 hover:underline font-medium">
          Delete permanently
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}
      {success && (
        <div className="mb-6 p-4 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm">
          Product updated successfully.
        </div>
      )}

      <div className="space-y-8">
        {/* Images — live, outside the form */}
        <section className="border rounded-2xl p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-lg">Images</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Drag to reorder. First image is the cover. Saved with Save Changes.</p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {imageItems.map((item, i) => {
              const url = item.kind === "server" ? item.url : item.previewUrl;
              const alt = item.kind === "server" ? (item.altText ?? "") : "";
              const key = item.kind === "server" ? item.id : item.localId;
              return (
                <div
                  key={key}
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
                  <img src={url} alt={alt} className="w-full h-full object-cover" />
                  {i === 0 && (
                    <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded-md">
                      Cover
                    </span>
                  )}
                  {item.kind === "pending" && (
                    <span className="absolute bottom-1 right-1 text-[10px] bg-orange-600/80 text-white px-1.5 py-0.5 rounded-md">
                      New
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeImage(item)}
                    className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              );
            })}

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

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info */}
          <section className="border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Basic Information</h2>

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
              <label className="block text-sm font-medium mb-1">Product Name</label>
              <input
                {...register("name")}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
              />
              {errors.name && <p className="text-red-600 text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <textarea
                {...register("description")}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 resize-none"
              />
              {errors.description && <p className="text-red-600 text-xs mt-1">{errors.description.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Ingredients</label>
              <textarea
                {...register("ingredients")}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Usage Suggestions</label>
              <textarea
                {...register("usageSuggestions")}
                rows={2}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700 resize-none"
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

          {/* Variants */}
          <section className="border rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-lg">Variants</h2>
            <p className="text-xs text-muted-foreground">Edit prices and stock, then click Save on each row.</p>
            {variants.map((v) => (
              <div key={v.id} className="border rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{v.weight}</span>
                  <span className="text-xs text-muted-foreground font-mono">{v.sku}</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium mb-1">Retail Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={(v.retailPrice / 100).toFixed(2)}
                      onChange={(e) => updateVariant(v.id, "retailPrice", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Wholesale Price (₹)</label>
                    <input
                      type="number"
                      step="0.01"
                      min={0}
                      defaultValue={(v.wholesalePrice / 100).toFixed(2)}
                      onChange={(e) => updateVariant(v.id, "wholesalePrice", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1">Stock (units)</label>
                    <input
                      type="number"
                      min={0}
                      defaultValue={v.stock}
                      onChange={(e) => updateVariant(v.id, "stock", e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-700"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => saveVariant(v.id)}
                  className="mt-3 text-xs text-orange-700 hover:underline font-medium"
                >
                  Save variant
                </button>
              </div>
            ))}
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
              {isSubmitting ? "Saving…" : "Save Changes"}
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
    </div>
  );
}
