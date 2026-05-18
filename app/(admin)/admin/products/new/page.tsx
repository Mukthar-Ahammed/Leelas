"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import {
  ArrowLeft, Package, Tag, FileText, ImageIcon, Layers,
  Percent, Plus, Trash2, CheckCircle2,
} from "lucide-react";

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

// ─── Shared styled input / textarea / select ──────────────────────────────────
const inputCls = "w-full border border-slate-200 bg-white rounded-xl px-4 py-3 text-[14px] font-semibold text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/30 focus:border-[#6d28d9] transition-all";
const labelCls = "block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider";
const errorCls = "text-red-500 text-xs font-semibold mt-1";
const sectionCls = "bg-[#fafbff] border border-slate-100 rounded-[1.5rem] p-8 space-y-5";
const sectionTitle = (icon: React.ReactNode, title: string) => (
  <div className="flex items-center gap-3 mb-2">
    <div className="w-9 h-9 rounded-xl bg-[#f0ebff] flex items-center justify-center">{icon}</div>
    <h2 className="text-[17px] font-extrabold text-slate-800">{title}</h2>
  </div>
);

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
      setNewCatName(""); setNewCatSlug("");
      setTimeout(() => setValue("categoryId", cat.id, { shouldValidate: true }), 0);
    }
    setCreatingCat(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const next = files.map((file) => ({ id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(file) }));
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
      ? { offerPercent: parseInt(offerPercent), offerStartsAt: offerStartsAt ? startOfDay(offerStartsAt) : null, offerEndsAt: offerEndsAt ? endOfDay(offerEndsAt) : null }
      : { offerPercent: null, offerStartsAt: null, offerEndsAt: null };

    const enrichedVariants = data.variants.map((v) => ({ ...v, sku: generateSku(data.name, v.weight) }));

    const res = await fetch("/api/admin/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...data, variants: enrichedVariants, ...offerPayload }),
    });

    if (!res.ok) {
      try { const json = await res.json(); setError(typeof json.error === "string" ? json.error : "Failed to create product"); }
      catch { setError("Failed to create product"); }
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
    <div className="bg-white min-h-[calc(100vh-2rem)] p-10 rounded-[2rem] shadow-sm">

      {/* Header */}
      <div className="flex items-center gap-4 mb-10">
        <a href="/admin/products" className="flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold text-[14px] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Products
        </a>
        <span className="text-slate-200">/</span>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Add Product</h1>
      </div>

      {error && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm font-semibold">
          {error}
        </div>
      )}

      <input type="hidden" {...register("slug")} />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">

        {/* ── Basic Info ─────────────────────────────────────────── */}
        <div className={sectionCls}>
          {sectionTitle(<Package className="w-4 h-4 text-[#6d28d9]" />, "Basic Information")}

          <div>
            <label className={labelCls}>Product Name</label>
            <input {...register("name")} className={inputCls} placeholder="e.g. Kerala Black Pepper" />
            {errors.name && <p className={errorCls}>{errors.name.message}</p>}
            {nameValue && (
              <p className="text-xs text-slate-400 font-semibold mt-1.5">
                Slug: <span className="font-mono">{generateSlug(nameValue)}</span>
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className={labelCls}>Category</label>
              <button type="button" onClick={() => setShowNewCat((s) => !s)}
                className="text-[12px] font-bold text-[#6d28d9] hover:underline">
                {showNewCat ? "Cancel" : "+ New category"}
              </button>
            </div>
            <select {...register("categoryId")} className={inputCls}>
              <option value="">Select a category…</option>
              {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
            {errors.categoryId && <p className={errorCls}>{errors.categoryId.message}</p>}
            {showNewCat && (
              <div className="mt-4 p-5 bg-white border border-slate-200 rounded-xl space-y-3">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">New Category</p>
                <input value={newCatName} onChange={(e) => handleNewCatName(e.target.value)}
                  className={inputCls} placeholder="e.g. Whole Spices" />
                <button type="button" disabled={!newCatName || !newCatSlug || creatingCat}
                  onClick={createCategory}
                  className="bg-[#6d28d9] text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-[#5b21b6] disabled:opacity-50 transition-colors">
                  {creatingCat ? "Creating…" : "Create Category"}
                </button>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls}>Description</label>
            <textarea {...register("description")} rows={4} className={inputCls} placeholder="Product description..." />
            {errors.description && <p className={errorCls}>{errors.description.message}</p>}
          </div>

          <div>
            <label className={labelCls}>Ingredients</label>
            <textarea {...register("ingredients")} rows={2} className={inputCls} placeholder="e.g. 100% whole black peppercorns" />
          </div>

          <div>
            <label className={labelCls}>Usage Suggestions</label>
            <textarea {...register("usageSuggestions")} rows={2} className={inputCls} placeholder="How to use this spice..." />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div>
              <p className="text-[14px] font-bold text-slate-700">Visible on store</p>
              <p className="text-[12px] text-slate-400 font-semibold mt-0.5">Customers will {isActive ? "see" : "not see"} this product</p>
            </div>
            <button type="button" onClick={() => setValue("isActive", !isActive)}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${isActive ? "bg-[#6d28d9]" : "bg-slate-200"}`}>
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${isActive ? "translate-x-6" : "translate-x-1"}`} />
            </button>
          </div>
        </div>

        {/* ── Images ─────────────────────────────────────────────── */}
        <div className={sectionCls}>
          {sectionTitle(<ImageIcon className="w-4 h-4 text-[#6d28d9]" />, "Images")}
          <p className="text-[13px] text-slate-400 font-semibold -mt-2">Drag to reorder. First image is the cover.</p>

          <div className="grid grid-cols-5 gap-3">
            {images.map((img, i) => (
              <div key={img.id} draggable onDragStart={() => setDragIndex(i)}
                onDragOver={(e) => e.preventDefault()} onDrop={() => handleDrop(i)}
                onDragEnd={() => setDragIndex(null)}
                className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-opacity ${dragIndex === i ? "opacity-40 border-[#6d28d9]" : "border-transparent"}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.previewUrl} alt="" className="w-full h-full object-cover" />
                {i === 0 && <span className="absolute bottom-1 left-1 text-[9px] bg-[#6d28d9] text-white px-1.5 py-0.5 rounded-md font-bold">Cover</span>}
                <button type="button" onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center hover:bg-red-600 transition-colors">×</button>
              </div>
            ))}
            <label className="aspect-square rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center cursor-pointer hover:border-[#6d28d9] hover:bg-[#f3f0ff]/30 transition-colors">
              <Plus className="w-5 h-5 text-slate-300" />
              <span className="text-[11px] text-slate-400 font-bold mt-1">Add photo</span>
              <input ref={fileInputRef} type="file" accept="image/*" multiple className="sr-only" onChange={handleFileSelect} />
            </label>
          </div>
        </div>

        {/* ── Variants ───────────────────────────────────────────── */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            {sectionTitle(<Layers className="w-4 h-4 text-[#6d28d9]" />, "Variants")}
            <button type="button"
              onClick={() => append({ weight: "", retailPrice: 0, wholesalePrice: 0, stock: 0 })}
              className="flex items-center gap-1.5 text-[12px] font-bold text-[#6d28d9] bg-[#f3f0ff] px-3 py-2 rounded-xl hover:bg-[#ede9fe] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Variant
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, i) => (
              <div key={field.id} className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-slate-500">Variant {i + 1}</span>
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(i)}
                      className="flex items-center gap-1 text-[12px] font-bold text-red-400 hover:text-red-600 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className={labelCls}>Weight</label>
                    <input {...register(`variants.${i}.weight`)} className={inputCls} placeholder="e.g. 250g" />
                    {errors.variants?.[i]?.weight && <p className={errorCls}>{errors.variants[i]?.weight?.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Stock (units)</label>
                    <input {...register(`variants.${i}.stock`, { valueAsNumber: true })} type="number" min={0} className={inputCls} placeholder="0" />
                  </div>
                  <div>
                    <label className={labelCls}>Retail Price (₹)</label>
                    <input {...register(`variants.${i}.retailPrice`, { setValueAs: (v) => Math.round(parseFloat(v) * 100) || 0 })}
                      type="number" step="0.01" min={0} className={inputCls} placeholder="0.00" />
                    {errors.variants?.[i]?.retailPrice && <p className={errorCls}>{errors.variants[i]?.retailPrice?.message}</p>}
                  </div>
                  <div>
                    <label className={labelCls}>Wholesale Price (₹)</label>
                    <input {...register(`variants.${i}.wholesalePrice`, { setValueAs: (v) => Math.round(parseFloat(v) * 100) || 0 })}
                      type="number" step="0.01" min={0} className={inputCls} placeholder="0.00" />
                    {errors.variants?.[i]?.wholesalePrice && <p className={errorCls}>{errors.variants[i]?.wholesalePrice?.message}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {errors.variants && !Array.isArray(errors.variants) && <p className={errorCls}>{errors.variants.message}</p>}
        </div>

        {/* ── Offer / Sale ───────────────────────────────────────── */}
        <div className={sectionCls}>
          <div className="flex items-center justify-between">
            {sectionTitle(<Percent className="w-4 h-4 text-[#6d28d9]" />, "Offer Price")}
            <label className="flex items-center gap-2 cursor-pointer">
              <div className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${offerEnabled ? "bg-[#6d28d9]" : "bg-slate-200"}`}
                onClick={() => setOfferEnabled((v) => !v)}>
                <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform ${offerEnabled ? "translate-x-6" : "translate-x-1"}`} />
              </div>
              <span className="text-[14px] font-bold text-slate-600">{offerEnabled ? "Enabled" : "Disabled"}</span>
            </label>
          </div>

          {offerEnabled && (
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>Discount %</label>
                <input type="number" min={1} max={99} value={offerPercent}
                  onChange={(e) => setOfferPercent(e.target.value)} placeholder="e.g. 20" className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Starts (optional)</label>
                <input type="date" value={offerStartsAt} onChange={(e) => setOfferStartsAt(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Ends</label>
                <input type="date" value={offerEndsAt} onChange={(e) => setOfferEndsAt(e.target.value)} className={inputCls} />
              </div>
            </div>
          )}
        </div>

        {/* ── Actions ────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 pt-2">
          <button type="submit" disabled={isSubmitting}
            className="flex items-center gap-2 bg-[#6d28d9] text-white px-8 py-3 rounded-xl font-bold hover:bg-[#5b21b6] transition-colors disabled:opacity-60 shadow-md shadow-[#6d28d9]/20">
            {isSubmitting ? "Creating…" : <><CheckCircle2 className="w-4 h-4" /> Create Product</>}
          </button>
          <a href="/admin/products"
            className="px-8 py-3 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-[14px]">
            Cancel
          </a>
        </div>
      </form>
    </div>
  );
}
